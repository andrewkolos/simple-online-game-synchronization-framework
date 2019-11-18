import { EventEmitter } from 'typed-event-emitter';
import { Entity, InputApplicator } from '../../entity';
import { EntityMessageKind, InputMessage, StateMessage } from '../../networking';
import { singleLineify } from '../../util/singleLineify';
import { EntityTargetedInput } from '../client';
import { EntityCollection } from '../entity-collection';
import { TwoWayMessageBuffer } from '../../networking/message-buffer';

type ClientId = string;

type ConnectionToClient<Input, State> = TwoWayMessageBuffer<InputMessage<Input>, StateMessage<State>>;

interface ClientInputs<Input, State> {
  client: ClientInfo<Input, State>;
  inputs: Array<InputMessage<Input>>;
}

/**
 * Validates inputs sent by the clients.
 * @param entity The entity that a client is attempting to apply the input to.
 * @param input The input that is meant to be applied to the entity.
 * @returns `true` if the input is acceptable and may be applied to the entity, `false` otherwise.
 */
type InputValidator<Input, State> = (entity: Entity<State>, input: Input) => boolean;

export interface ServerEntitySyncherArgs<Input, State> {
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

export interface ClientInformation {
  id: string;
  lastAcknowledgedInputSeqNumber: number;
}

type OnSynchronizedHandler<Input, State> = (entities: ReadonlyArray<Entity<State>>, inputsApplied: Array<EntityTargetedInput<Input>>) => void;

/**
 * Creates and synchronizes game entities for clients.
 * @template E The type of entity/entities this synchronizer can work with.
 */
export class ServerEntitySyncer<Input, State> extends EventEmitter {

  public readonly onPreSynchronization = this.registerEvent<() => void>();
  public readonly onSynchronized = this.registerEvent<OnSynchronizedHandler<Input, State>>();

  private readonly inputValidator: InputValidator<Input, State>;
  private readonly inputApplicator: InputApplicator<Input, State>;
  private readonly clientIdAssigner: () => string;

  private readonly _entities: EntityCollection<State>;
  private readonly clients: Map<string, ClientInfo<Input, State>>;

  constructor(args: ServerEntitySyncherArgs<Input, State>) {
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
    const client: ClientInfo<Input, State> = {
      id: newClientId,
      connection,
      seqNumberOfLastProcessedInput: 0,
      ownedEntityIds: [],
    };

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
      client.ownedEntityIds.push(entity.id);
    } else {
      throw Error(`Unknown client ${playerClientId} when adding new player entity.`);
    }
  }

  public getClientInformation(): ReadonlyMap<ClientId, ClientInfo<Input, State>>;
  public getClientInformation(clientId: string): ClientInfo<Input, State>;
  public getClientInformation(clientId?: string) {
    if (clientId == null) return this.clients as ReadonlyMap<ClientId, ClientInfo<Input, State>>;
    const client = this.clients.get(clientId);
    if (client != null) {
      return client;
    } else {
      throw Error(`Did not find client with an ID of ${clientId}`);
    }
  }

  /**
   * Process all inputs received from clients, updating entities, and then send
   * the states of all entities to all clients.
   * @param entityStates Overrides this synchronizer's current representation
   * of certain entities. This parameter should be used unless the state of
   * the world is completely determined by player inputs.
   */
  public synchronize(entityStates?: Array<Entity<State>>): ReadonlyArray<Entity<State>> {
    this.emit(this.onPreSynchronization);

    if (entityStates != null) this.setEntityState(...entityStates);
    const inputs = this.retrieveValidInputs();
    this.applyInputs(inputs);
    this.sendStates();

    this.emit(this.onSynchronized, this._entities.asArray(), inputs.map((ci) => ci.inputs).flat());
    return this._entities.asArray();
  }

  private setEntityState(...entities: Array<Entity<State>>) {
    for (const entity of entities) {
      const localState = this._entities.getState(entity.id);
      if (localState == null) {
        throw Error(singleLineify`
          Unknown entity ${entity.id}. The entity must be added to this synchronizer before
          manually changing its state.
        `);
      }
    }
  }

  private retrieveValidInputs(): Array<ClientInputs<Input, State>> {
    const inputsByClient: Array<ClientInputs<Input, State>> = [];

    for (const client of this.clients.values()) {
      const messages = [...client.connection];
      const validInputs: Array<InputMessage<Input>> = [];

      for (const input of messages) {
        const state = this._entities.getState(input.entityId);

        // Client sent an input for an entity it does not own.
        if (!client.ownedEntityIds.includes(input.entityId)) {
          continue;
        }

        if (state != undefined && this.inputValidator({ id: input.entityId, state }, input.input)) {
          validInputs.push(input);
        }
      }
      inputsByClient.push({ client, inputs: validInputs });
    }

    return inputsByClient;
  }

  private applyInputs(inputsByClient: Array<ClientInputs<Input, State>>): void {
    for (const { client, inputs } of inputsByClient) {
      for (const input of inputs) {
        const { entityId } = input;
        const state = this._entities.getState(entityId);
        if (state == null) throw Error(`Cannot apply input to unknown entity '${entityId}'.`);
        this._entities.set({ id: entityId, state: this.inputApplicator(state, input.input) });
        client.seqNumberOfLastProcessedInput = input.inputSequenceNumber;
      }
    }
  }

  /**
   * Sents the state of all entities to the connected clients.
   */
  private sendStates() {
    const clients = Array.from(this.clients.values());
    const entities = this._entities.asArray();
    for (const client of clients) {
      const messages: Array<StateMessage<State>> = entities.map((entity: Entity<State>) => {
        const entityBelongsToClient = client.ownedEntityIds.includes(entity.id);

        const networkedStateMessageBase: StateMessage<State> = {
          kind: EntityMessageKind.State,
          entity: {
            id: entity.id,
            state: entity.state,
          },
          sentAt: new Date().getTime(),
        };

        if (entityBelongsToClient) {
          return {
            ...networkedStateMessageBase,
            entityBelongsToRecipientClient: true,
            lastProcessedInputSequenceNumber: client.seqNumberOfLastProcessedInput,
          };
        } else {
          return networkedStateMessageBase;
        }
      });
      client.connection.send(messages);
    }
  }
}

/**
 * Information the server stores about a client.
 * @template E The type of entity/entities.
 */
export interface ClientInfo<Input, State> {
  id: string;
  connection: ConnectionToClient<Input, State>;
  seqNumberOfLastProcessedInput: number;
  ownedEntityIds: string[];
}
