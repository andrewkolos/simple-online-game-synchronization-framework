import { EntityCollection } from './entity-collection';
import { TypedEventEmitter } from './event-emitter';
import { InputCollectionStrategy } from './input-collection-strategy';
import { InputForEntity } from './input-for-entity';
import { IntervalRunner } from "./interval-runner";
import { InputMessage, EntityMessageKind } from './networking';
import { ClientEntityMessageBuffer, Timestamp } from './networking/message-buffer';
import { SyncableEntity } from './syncable-entity';
import { DeepReadonly } from './util';

export type EntityId = string;

export interface EntityFactory {
  fromStateMessage(entityId: string, state: any): SyncableEntity<any, any>;
}

export interface ClientEntitySynchronizerEvents {
  synchronized(): void;
}

export interface ClientEntitySynchronizerContext {
  serverConnection: ClientEntityMessageBuffer; 
  serverUpdateRateInHz: number;
  entityFactory: EntityFactory;
  inputCollector: InputCollectionStrategy;
}

/**
 * Collects user inputs.
 * Translates inputs into intents specific to objects.
 * Sends intents to GameEngine on pre-tick, which will be applied on tick.
 */
export class ClientEntitySynchronizer {
  /** Contains game state and can accept inputs. */
  public entities: EntityCollection;

  public eventEmitter: DeepReadonly<TypedEventEmitter<ClientEntitySynchronizerEvents>> = new TypedEventEmitter();

  /** Provides state messages. */
  private readonly server: ClientEntityMessageBuffer;
  /** Constructs representations of new entities given a state object. */
  private readonly entityFactory: EntityFactory;
  private readonly serverUpdateRateInHz: number;
  /** Collects user inputs. */
  private readonly inputCollectionStrategy: InputCollectionStrategy;
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
  private pendingInputs: InputMessage[] = [];

  /** The time of the most recent input collection. */
  private lastInputCollectionTimestamp: number | undefined;

  /**
   * IDs of entities that are meant to be controlled by this client's player.
   */
  private readonly playerEntityIds: EntityId[] = [];

  private readonly entityStateBuffers = new Map<EntityId, { timestamp: Timestamp; state: Object }[]>();

  private updateInterval?: IntervalRunner;

  /**
   * Gets the number of inputs that this client has yet to receive an acknowledgement
   * for from the server.
   */
  public get numberOfPendingInputs() {
    return this.pendingInputs.length;
  }

  /**
   * Creates an instance of game client.
   * @param server A connection to the game server.
   * @param entityFactory A strategy to create local representations of
   *   new entities sent by the server.
   * @param serverUpdateRateInHz How often the server will be sending out
   *  the world state.
   * @param inputCollector Used to obtain inputs from the user that can be applied
   *  to entities in the game.
   */
  constructor(context: ClientEntitySynchronizerContext) {

    this.entities = new EntityCollection();
    this.server = context.serverConnection;
    this.entityFactory = context.entityFactory;
    this.serverUpdateRateInHz = context.serverUpdateRateInHz;
    this.inputCollectionStrategy = context.inputCollector;
  }

  /**
   * Determines whether has received communication from the game server.
   * @returns true if connected.
   */
  public isConnected(): boolean {
    return this.playerEntityIds.length > 0;
  }

  public start(updateRateHz: number) {
    this.stop();
    this.updateInterval = new IntervalRunner(() => this.update(), 1000 / updateRateHz);
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

    this.interpolateEntities();

    this.eventEmitter.emit('synchronized');
  }

  /**
   * Process all new messages sent by the server.
   * Add new entities, update our player-controlled entities to have the state sent by the server, then reapply
   * pending inputs that have yet to be acknowledged by the server.
   * 
   */
  private processServerMessages() {
    const isFirstTimeSeeingEntity = (entityId: string) => !this.entities.getEntities().some((ge) => ge.id === entityId);

    while (this.server.hasNext()) {
      const stateMessage = this.server.receive();

      if (isFirstTimeSeeingEntity(stateMessage.entityId)) {
        const entity = this.entityFactory.fromStateMessage(stateMessage.entityId, stateMessage.state);
        if (entity.id !== stateMessage.entityId) {
          throw Error(`Entity created by entity factory has an incorrect id: ${entity.id} != ${stateMessage.entityId}`);
        }
        this.entities.addEntity(entity);
        this.entityStateBuffers.set(stateMessage.entityId, []);

        if (stateMessage.entityBelongsToRecipientClient != null) {
          this.playerEntityIds.push(stateMessage.entityId);
        }
      }

      if (this.playerEntityIds.includes(stateMessage.entityId)) {
        const entity = this.entities.getEntityById(stateMessage.entityId);

        if (entity == null) throw Error('Unknown entity was not created.');

        entity.state = stateMessage.state; // Received authoritative position for our entity.

        // Perform server reconciliation. When the client receives an update about its entities
        // from the server, apply them, and then reapply all local pending inputs (have timestamps
        // later than the timestamp sent by the server).
        this.pendingInputs = this.pendingInputs.filter((input: InputMessage) => {
          return input.inputSequenceNumber > stateMessage.lastProcessedInputSequenceNumber;
        });

        this.pendingInputs.forEach((inputMessage: InputMessage) => {
          const entity = this.entities.getEntityById(inputMessage.entityId);
          if (entity == null) { throw Error('Did not find entity corresponding to a pending input.'); }

          entity.state = entity.calcNextStateFromInput(entity.state, inputMessage.input);
        });
      } else {
        // Received the state of an entity that does not belong to this client.

        const timestamp = new Date().getTime();
        const stateBuffer = this.entityStateBuffers.get(stateMessage.entityId);
        if (stateBuffer == null) { throw Error(`Did not find state buffer for entity with id ${stateMessage.entityId}.`) }
        stateBuffer.push({ timestamp, state: stateMessage.state });
      }
    }
  }

  /**
   * Collects inputs from player (or AI), stamps them with a timestamp and sequence number,
   * sends them to the server, and applies them locally.
   */
  private processInputs(): void {

    const now = new Date().getTime();

    const getInputs = (): InputForEntity[] => {

      const lastInputCollectionTime = this.lastInputCollectionTimestamp != null
        ? this.lastInputCollectionTimestamp : now;

      const timeSinceLastInputCollection = now - lastInputCollectionTime;

      this.lastInputCollectionTimestamp = now;

      return this.inputCollectionStrategy.getInputs(timeSinceLastInputCollection);
    }

    const inputs = getInputs();

    inputs.forEach(input => {

      const inputMessage: InputMessage = {
        kind: EntityMessageKind.Input,
        entityId: input.entityId,
        inputSequenceNumber: this.currentInputSequenceNumber,
        input: input.input
      };

      this.server.send(inputMessage);

      const playerEntity = this.entities.getEntityById(input.entityId);

      if (playerEntity == undefined) { throw Error(`Received input for unknown entity ${input.entityId}.`); }

      playerEntity.state = playerEntity.calcNextStateFromInput(playerEntity.state, input.input); // Client-side prediction.

      this.pendingInputs.push(inputMessage); // Save for later reconciliation.
    });

    if (inputs.length > 0) {
      this.currentInputSequenceNumber = this.currentInputSequenceNumber + 1;
    }
  }

  /**
   * Smooths out the state of entities controlled by other players.
   */
  private interpolateEntities(): void {
    const now = new Date().getTime();
    const renderTimestamp = now - (1000.0 / this.serverUpdateRateInHz);

    this.entities.getEntities().forEach((entity: SyncableEntity<any, any>) => {
      if (this.playerEntityIds.includes(entity.id)) {
        // No point in interpolating an entity that belongs to this client.
        return;
      }

      // Find the two authoritative positions surrounding the timestamp.
      const buffer = this.entityStateBuffers.get(entity.id);
      if (buffer == undefined) { throw Error(`Could not find state buffer for entity ${entity.id}.`) }

      // Drop older positions.
      while (buffer.length >= 2 && buffer[1].timestamp <= renderTimestamp) {
        buffer.shift();
      }

      // Get the "average" (whatever the entity's interpolation scheme decides) of the two states in which
      // the current timestamp falls in-between.
      if (buffer.length >= 2 && buffer[0].timestamp <= renderTimestamp && renderTimestamp <= buffer[1].timestamp) {

        const timeRatio = (renderTimestamp - buffer[0].timestamp) / (buffer[1].timestamp - buffer[0].timestamp);
        entity.state = entity.interpolate(buffer[0].state, buffer[1].state, timeRatio);
      }
    });
  }
}