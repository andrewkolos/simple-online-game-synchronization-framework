import { DeepReadonly, singleLineify } from 'src/util';
import { AnyEntity, PickInput, PickState } from '../../entity';
import { EntityMessageKind, InputMessage, StateMessage } from '../../networking';
import { ClientEntityMessageBuffer } from '../../networking/message-buffer';
import { TypedEventEmitter } from '../../util/event-emitter';
import { Interval, IntervalRunner } from '../../util/interval-runner';
import { EntityCollection } from '../entity-collection';
import { EntityBoundInput } from './entity-bound-input';
import { InputCollectionStrategy } from './input-collection-strategy';
import { CheckedNewEntityHandler, EntityFactory } from './entity-factory';

type EntityId = string;

export interface ClientEntitySynchronizerEvents<E extends AnyEntity> {
  synchronized(entityMap: Map<EntityId, DeepReadonly<E>>): void;
}

/**
 * Contains the information needed to construct a `ClientEntitySynchronizer`.
 */
export interface ClientEntitySynchronizerArgs<E extends AnyEntity> {
  /** A connection to the game server. */
  serverConnection: ClientEntityMessageBuffer<E>;
  /** How often the server will be sending out the world state. */
  serverUpdateRateInHz: number;
  /** A strategy to create local representations of new entities sent by the server. */
  newEntityHandler: EntityFactory<E>;
  /** A strategy to obtain inputs from the user that can be applied to entities in the game. */
  inputCollectionStrategy: InputCollectionStrategy<PickInput<E>>;
}

/**
 * Collects user inputs.
 * Translates inputs into intents specific to objects.
 * Sends intents to GameEngine on pre-tick, which will be applied on tick.
 */
export class ClientEntitySynchronizer<E extends AnyEntity> extends
 TypedEventEmitter<ClientEntitySynchronizerEvents<E>> {

  /**
   * Gets the number of inputs that this client has yet to receive an acknowledgement
   * for from the server.
   */
  public get numberOfPendingInputs() {
    return this.pendingInputs.length;
  }
  /** Contains game state and can accept inputs. */
  private readonly entities: EntityCollection<E>;

  /** Provides state messages. */
  private readonly server: ClientEntityMessageBuffer<E>;
  /** Constructs representations of new entities given a state object. */
  private readonly entityFactory: EntityFactory<E>;
  /** Collects user inputs. */
  private readonly inputCollectionStrategy: InputCollectionStrategy<PickInput<E>>;
  /**
   * The number assigned to the next set of inputs that will be sent out by this
   * game client. Used for server reconciliation.
   */
  private currentInputSequenceNumber = 0;
  /**
   * Inputs with sequence numbers later than that of the last server message received.
   * These inputs will be reapplied when the client receives a new authoritative state
   * sent by the server.
   */
  private pendingInputs: Array<InputMessage<PickInput<E>>> = [];

  /** The time of the most recent input collection. */
  private lastInputCollectionTimestamp: number | undefined;

  /**
   * IDs of entities that are meant to be controlled by this client's player.
   */
  private readonly playerEntityIds: EntityId[] = [];

  private updateInterval?: IntervalRunner;

  /**
   * Creates an instance of game client.
   */
  constructor(args: ClientEntitySynchronizerArgs<E>) {
    super();

    this.entities = new EntityCollection();

    this.server = args.serverConnection;
    this.entityFactory = new CheckedNewEntityHandler(args.newEntityHandler);
    this.inputCollectionStrategy = args.inputCollectionStrategy;
  }

  /**
   * Determines whether has received communication from the game server.
   * @returns `true` if connected, `false` otherwise.
   */
  public isConnected(): boolean {
    return this.entities.asArray().length > 0;
  }

  public start(updateRateHz: number) {
    this.stop();
    this.updateInterval = new IntervalRunner(() => this.update(), Interval.fromHz(updateRateHz));
    this.updateInterval.start();
  }

  public stop() {
    if (this.updateInterval != null && this.updateInterval.isRunning()) {
      this.updateInterval.stop();
    }
  }

  /**
   * Updates the state of the game, based on the game itself, messages regarding
   * the state of the world sent by the server, and inputs from the user.
   */
  private update() {
    this.processServerMessages();

    if (!this.isConnected()) { return; }

    this.processInputs();

    this.emit('synchronized', this.entities.asIdKeyedMap() as Map<EntityId, DeepReadonly<E>>);
  }

  /**
   * Process all new messages sent by the server.
   * Add new entities, update our player-controlled entities to have the state sent by the server, then reapply
   * pending inputs that have yet to be acknowledged by the server.
   */
  // tslint:disable-next-line: member-ordering
  private readonly processServerMessages = (() => {

    const isFirstTimeSeeingEntity = (entityId: string) => !this.entities.asArray().some((ge) => ge.id === entityId);

    const handleNewEntity = (stateMessage: StateMessage<PickState<E>>) => {

      const entityBelongsToThisClient = stateMessage.entity.belongsToRecipientClient;
      if (entityBelongsToThisClient != null && entityBelongsToThisClient) {
        this.playerEntityIds.push(stateMessage.entity.id);
      }
      const entity = this.entityFactory.fromStateMessage(stateMessage);
      this.entities.add(entity);
    };

    return () => {
      for (const stateMessage of this.server) {
        const stateMessageEntityId = stateMessage.entity.id;

        if (isFirstTimeSeeingEntity(stateMessageEntityId)) {
          handleNewEntity(stateMessage);
        }

        const entity = this.entities.get(stateMessageEntityId);
        if (entity == null) {
          throw Error(singleLineify`
            Received state message with entity ID '${stateMessageEntityId}',
            but no entity with that ID exists on this client.
          `);
        }

        if (this.entityBelongsToLocalPlayer(stateMessage.entity.id)) {
          entity.state = stateMessage.entity.state; // Received authoritative position for our entity.

          this.reconcileLocalStateWithServerState(stateMessage);
        } else {
          entity.synchronizeToServer(stateMessage);
        }
      }
    };

  })();

  /**
   * Determines if an entity is to be controlled by this client.
   * @param entityId The ID of the entity.
   */
  private entityBelongsToLocalPlayer(entityId: string) {
    return this.playerEntityIds.includes(entityId);
  }

  /**
   * Perform server reconciliation. When the client receives an update about its entities
   * from the server, apply them, and then reapply all local pending inputs (have timestamps
   * later than the timestamp sent by the server).
   */
  private reconcileLocalStateWithServerState(stateMessage: StateMessage<PickState<E>>) {

    this.pendingInputs = this.pendingInputs.filter((input: InputMessage<PickInput<E>>) => {
      return input.inputSequenceNumber > stateMessage.lastProcessedInputSequenceNumber;
    });
    this.pendingInputs.forEach((inputMessage: InputMessage<PickInput<E>>) => {
      const entity = this.entities.get(inputMessage.entityId);
      if (entity == null) {
        throw Error('Did not find entity corresponding to a pending input.');
      }
      entity.applyInput(inputMessage.input);
    });
  }

  /**
   * Collects inputs from player (or AI), stamps them with a timestamp and sequence number,
   * sends them to the server, and applies them locally.
   */
  private processInputs(): void {

    const now = new Date().getTime();

    const getInputs = (): Array<EntityBoundInput<PickInput<E>>> => {

      const lastInputCollectionTime = this.lastInputCollectionTimestamp != null
        ? this.lastInputCollectionTimestamp : now;

      const timeSinceLastInputCollection = now - lastInputCollectionTime;

      this.lastInputCollectionTimestamp = now;

      return this.inputCollectionStrategy.getInputs(timeSinceLastInputCollection);
    };

    const entityBoundInputs = getInputs();

    entityBoundInputs.forEach((input) => {

      const inputMessage: InputMessage<PickInput<E>> = {
        entityId: input.entityId,
        input: input.input,
        inputSequenceNumber: this.currentInputSequenceNumber,
        messageKind: EntityMessageKind.Input,
      };

      this.server.send(inputMessage);

      const playerEntity = this.entities.get(input.entityId);

      if (playerEntity == undefined) { throw Error(`Received input for unknown entity ${input.entityId}.`); }

      playerEntity.applyInput(input.input); // Client-side prediction.

      this.pendingInputs.push(inputMessage); // Save for later reconciliation.
    });

    if (entityBoundInputs.length > 0) {
      this.currentInputSequenceNumber = this.currentInputSequenceNumber + 1;
    }
  }
}
