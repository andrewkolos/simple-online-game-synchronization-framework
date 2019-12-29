import { EventEmitter } from 'typed-event-emitter';
import { Entity } from '../../entity';
import { InputMessage, StateMessage } from '../../networking';
import { singleLineify } from '../../util/singleLineify';
import { EntityTargetedInput } from '../client';
import { EntityCollection } from '../entity-collection';
import { TwoWayMessageBuffer } from '../../networking/message-buffers/two-way-message-buffer';
import { InputApplicator, InputValidator } from './input-processing';
import { Client } from './client';

type ClientId = string;

type ConnectionToClient<Input, State> = TwoWayMessageBuffer<InputMessage<Input>, StateMessage<State>>;

export interface ServerEntitySyncerArgs<Input, State> {
  /**
   * Validates inputs, preventing them from being applied if they are invalid/fraudulent.
   */
  inputValidator: InputValidator<Input, State>;
  /**
   * Determines the state of an entity after and an input is applied to it.
   */
  inputApplicator: InputApplicator<Input, State>;
  /**
   * Determines the ID a new client should be assigned.
   * @returns The ID to be assigned to the new client.
   */
  clientIdAssigner: () => string;
}

export interface OnServerSynchronzedEventClientInfo {
  id: ClientId;
  lastAckInputSeqNumber: number;
}

export interface OnServerSynchronizedEvent<Input, State> {
  entities: Array<Readonly<Entity<State>>>;
  inputsApplied: Array<EntityTargetedInput<Input>>;
  clientInformation: OnServerSynchronzedEventClientInfo[];
}

/**
 * Creates and synchronizes game entities for clients.
 * @template E The type of entity/entities this synchronizer can work with.
 */
export class ServerEntitySyncer<Input, State> extends EventEmitter {

  public readonly onPreSynchronization = this.registerEvent<() => void>();
  public readonly onSynchronized = this.registerEvent<(e: OnServerSynchronizedEvent<Input, State>) => void>();

  private readonly inputValidator: InputValidator<Input, State>;
  private readonly inputApplicator: InputApplicator<Input, State>;
  private readonly clientIdAssigner: () => string;

  private readonly _entities: EntityCollection<State>;
  private readonly clients: Map<string, Client<Input, State>>;

  constructor(args: ServerEntitySyncerArgs<Input, State>) {
    super();
    this.inputApplicator = args.inputApplicator;
    this.inputValidator = args.inputValidator;
    this.clientIdAssigner = args.clientIdAssigner;
    this.clients = new Map();
    this._entities = new EntityCollection();
  }

  /**
   * Connects this server synchronizer to a client given a connection to it.
   * @param connection A connection to the client, in the form of a message buffer.
   * @returns The ID assigned to the client.
   */
  public connectClient(connection: ConnectionToClient<Input, State>): ClientId {

    const newClientId = this.clientIdAssigner();
    const client = new Client({
      id: newClientId,
      connection,
      inputValidator: this.inputValidator,
    });
    this.clients.set(newClientId, client);

    return newClientId;
  }

  /**
   * Adds a non-player entity (i.e. not controlled by any player/client).
   * @param entity The entity to add to the server.
   */
  public addNonPlayerEntity(entity: Entity<State>) {
    this._entities.set(entity);
  }

  /**
   * Adds a player entity (i.e. to be controlled by a player via a client).
   * @param entity
   * @param playerClientId
   */
  public addPlayerEntity(entity: Entity<State>, playerClientId: string) {
    this._entities.set(entity);
    const client = this.clients.get(playerClientId);

    if (client != null) {
      client.assignOwnershipOfEntity(entity.id);
    } else {
      throw Error(`Unknown client ${playerClientId} when adding new player entity.`);
    }
  }

  /**
   * Process all inputs received from clients, updating entities, and then send
   * the states of all entities to all clients.
   */
  public synchronize(): ReadonlyArray<Entity<State>> {
    this.emit(this.onPreSynchronization);

    const inputs = this.retrieveValidInputs();
    this.applyInputs(inputs);
    this.sendStates();

    this.emit(this.onSynchronized, {
      entities: this._entities.asArray(),
      inputsApplied: inputs.flat(),
      clientInformation: [...this.clients.values()].map((c) => ({id: c.id, lastAckInputSeqNumber: c.seqNumberOfLastProcessedInput})),
    });
    return this._entities.asArray();
  }

  /**
   * Overwrites the state of an entity.
   * @param id The ID of the entity.
   * @param state The properties of the entity's state to overwrite and their values.
   */
  public setEntityState(id: string, state: Partial<State>) {
    const localState = this._entities.getState(id);
    if (localState == null) {
      throw Error(singleLineify`
          Unknown entity ${id}. The entity must be added to this synchronizer before
          manually changing its state.
        `);
    }
    Object.assign(localState, state);
  }

  private retrieveValidInputs(): Array<InputMessage<Input>> {
    const inputsByClient: Array<InputMessage<Input>> = [];

    for (const client of this.clients.values()) {
      inputsByClient.push(...client.retrieveInputs(this._entities));
    }

    return inputsByClient;
  }

  private applyInputs(inputs: Array<InputMessage<Input>>): void {
    for (const input of inputs) {
      const { entityId } = input;
      const state = this._entities.getState(entityId);
      if (state == null) throw Error(`Cannot apply input to unknown entity '${entityId}'.`);
      this._entities.set({ id: entityId, state: this.inputApplicator(state, input.input) });
    }
  }

  /**
   * Sents the state of all entities to the connected clients.
   */
  private sendStates() {
    const clients = Array.from(this.clients.values());
    const entities = this._entities.asArray();
    for (const client of clients) {
      client.sendStates(entities.map((e) => ({
        entityId: e.id,
        state: e.state,
      })));
    }
  }
}
