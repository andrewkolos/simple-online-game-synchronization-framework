import { AnyEntity, PickState, PickInput } from 'src/entity/entity';
import { ServerEntityMessageBuffer } from '../../networking/message-buffer';
import { TypedEventEmitter } from '../../util/event-emitter';
import { Interval, IntervalRunner } from "../../util/interval-runner";
import { EntityCollection } from '../entity-collection';
import { DeepReadonly, fromMapGetOrDefault } from 'src/util';
import { StateMessage, EntityMessageKind, InputMessage } from 'src/networking/messages';

type ClientId = string;
type EntityId = string;

export interface ServerEntitySynchronizerEvents<E extends AnyEntity> {
  beforeSynchronization(): void;
  beforeInputsApplied(inputs: InputMessage<E>[]): void;
  synchronized(entityMap: Map<EntityId, DeepReadonly<E>>): void;
}

/**
 * Creates and synchronizes game entities for clients.
 * @template E The type of entity/entities this synchronizer can work with.
 */
export abstract class ServerEntitySynchronizer<E extends AnyEntity> extends TypedEventEmitter<ServerEntitySynchronizerEvents<E>> {

  private updateRateHz: number;

  private readonly entities: EntityCollection<E>;

  private readonly clients: Map<string, ClientInfo<E>>;

  private updateInterval?: IntervalRunner;

  constructor() {
    super();
    this.clients = new Map();
    this.entities = new EntityCollection();
    this.updateRateHz = 10;
  }

  /**
   * Connects this server synchronizer to a client given a connection to it.
   * @param connection A connection to the client, in the form of a message buffer.
   * @returns The ID assigned to the client.
   */
  public connectClient(connection: ServerEntityMessageBuffer<E>): ClientId {

    const newClientId = this.getIdForNewClient();
    const client: ClientInfo<E> = {
      id: newClientId,
      messageBuffer: connection,
      seqNumberOfLastProcessedInput: 0,
      ownedEntityIds: []
    };

    this.clients.set(newClientId, client);

    this.handleClientConnection(newClientId);

    return newClientId;
  }

  /**
   * Adds a non-player entity (i.e. not controlled by any player/client).
   * @param entity The entity to add to the server.
   */
  public addNonPlayerEntity(entity: E) {
    this.entities.addEntity(entity);
  }

  /**
   * Adds a player entity (i.e. to be controlled by a player via a client).
   * @param entity 
   * @param playerClientId 
   */
  public addPlayerEntity(entity: E, playerClientId: string) {
    this.entities.addEntity(entity);
    const client = this.clients.get(playerClientId);

    if (client != null) {
      client.ownedEntityIds.push(entity.id);
    } else {
      throw Error(`Unknown client ${playerClientId} when adding new player entity.`);
    }
  }

  /**
   * Starts the server.
   * @param updateRateHz The rate at which the server should update.
   */
  public start(updateRateHz: number) {
    this.updateRateHz = updateRateHz;

    this.stop();

    if (updateRateHz > 0) {
      this.updateInterval = new IntervalRunner(() => this.update(), Interval.fromHz(this.updateRateHz));
      this.updateInterval.start();
    }
  }

  /**
   * Stops the server.
   */
  public stop() {
    if (this.updateInterval != null && this.updateInterval.isRunning()) {
      this.updateInterval.stop();
    }
  }

  /**
   * Given a client (identified by its ID), gets the last input sent by the client
   * that this server processed.
   * @param clientId The client's ID.
   * @returns The last input sent by the client that this server processed.
   */
  public getLastProcessedInputForClient(clientId: string) {

    const client = this.clients.get(clientId);
    if (client != null) {
      return client.seqNumberOfLastProcessedInput;
    } else {
      throw Error(`Did not find client with an ID of ${clientId}`);
    }
  }

  /**
   * Called when a new client connects to the server. Can be used, for example,
   * to create a player entity for the new client and add it to the game.
   * @param newClientId The id assigned to the new client.
   */
  protected abstract handleClientConnection(newClientId: string): void;

  /**
   * Determines the ID a new client should be assigned.
   * @returns The ID to be assigned to the new client.
   */
  protected abstract getIdForNewClient(): ClientId;

  /**
   * Validates inputs sent by the clients, to make sure they are not fradulent,
   * before letting them be applied to the entities.
   * @param entity The entity that a client is attempting to apply the input to.
   * @param input The input that is meant to be applied to the entity.
   * @returns `true` if the input is acceptable and may be applied to the entity, `false` otherwise.
   */
  protected abstract validateInput(entity: E, input: PickInput<E>): boolean;

  /**
   * Processes all inputs received from clients, updating entities, and then sends
   * back to clients the state of the entities.
   */
  private update() {
    this.emit("beforeSynchronization");

    this.processInputs();
    this.sendStates();

    this.emit("synchronized", this.entities.asIdKeyedMap() as Map<EntityId, DeepReadonly<E>>);
  }

  /**
   * Processes all available inputs.
   */
  private processInputs() {
    const inputs: Map<ClientInfo<E>, InputMessage<E>[]> = new Map();

    for (const client of this.clients.values()) {
      const messages = [...client.messageBuffer];
      inputs.set(client, messages);
    }

    const asSingleArray: InputMessage<E>[] = [...inputs.values()].reduce((concatenated, current) => concatenated.concat(current));
    this.emit("beforeInputsApplied", asSingleArray);

    for (const client of inputs.keys()) {
      for (const input of fromMapGetOrDefault(inputs, client, [])) {
        const entity = this.entities.getEntityById(input.entityId);

        // Client sent an input for an entity it does not own.
        if (!client.ownedEntityIds.includes(input.entityId)) {
          continue;
        }

        if (entity != undefined && this.validateInput(entity, input.input)) {
          entity.applyInput(input.input);
          client.seqNumberOfLastProcessedInput = input.inputSequenceNumber;
        }
      }
    }
  }

  /**
   * Sents the state of all entities to the connected clients.
   */
  private sendStates() {
    const clients = Array.from(this.clients.values());
    const entities = this.entities.asArray();
    for (const client of clients) {
      entities.forEach((entity: E) => {
        const entityBelongsToClient = client.ownedEntityIds.includes(entity.id);

        const networkedStateMessage: StateMessage<E> = {
          messageKind: EntityMessageKind.State,
          entity: {
            id: entity.id,
            kind: entity.kind,
            state: entity.state as PickState<E>,
            belongsToRecipientClient: entityBelongsToClient,
          },
          lastProcessedInputSequenceNumber: client.seqNumberOfLastProcessedInput,
          timestampMs: new Date().getTime(),
        };

        client.messageBuffer.send(networkedStateMessage);
      });
    }
  }
}

/**
 * Information the server stores about a client.
 * @template E The type of entity/entities.
 */
export interface ClientInfo<E extends AnyEntity> {
  id: string;
  messageBuffer: ServerEntityMessageBuffer<E>;
  seqNumberOfLastProcessedInput: number;
  ownedEntityIds: string[];
}
