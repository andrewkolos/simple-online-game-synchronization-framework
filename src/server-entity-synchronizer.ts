import { EntityCollection } from './entity-collection';
import { TypedEventEmitter } from './event-emitter';
import { IntervalRunner } from "./interval-runner";
import { EntityMessageKind, StateMessageFromEntityMap } from './networking';
import { ServerEntityMessageBuffer } from './networking/message-buffer';
import { EntityTypeMap, PickInputType, PickStateType, SyncableEntity, SyncableEntityFromMap } from './syncable-entity';

export interface ServerEntitySynchronizerEvents {
  synchronized(): void;
}

export interface EntityStateBroadcastMessage<S> {
  entityId: string,
  state: S;
}

/**
 * Creates and synchronizes game entities for clients.
 */
export abstract class ServerEntitySynchronizer<M extends EntityTypeMap> {

  public updateRateHz: number;

  public entities: EntityCollection<M>;

  public eventEmitter: TypedEventEmitter<ServerEntitySynchronizerEvents> = new TypedEventEmitter();

  private readonly clients: Map<string, ClientInfo<M>>;

  private updateInterval?: IntervalRunner;

  constructor() {
    this.clients = new Map();
    this.entities = new EntityCollection();
    this.updateRateHz = 10;
  }

  public connect(connection: ServerEntityMessageBuffer<PickInputType<M>, PickStateType<M>>): string {

    const newClientId = this.getIdForNewClient();

    const client: ClientInfo<M> = {
      clientId: newClientId,
      connection,
      lastProcessedInput: 0,
      ownedEntityIds: []
    };

    this.clients.set(newClientId, client);

    this.handleClientConnection(newClientId);

    return newClientId;
  }

  public addPlayerEntity(entity: SyncableEntityFromMap<M>, playerClientId: string) {
    this.entities.addEntity(entity);
    const client = this.clients.get(playerClientId);

    if (client != null) {
      client.ownedEntityIds.push(entity.id);
    } else {
      throw Error(`Unknown client ${playerClientId} when adding new player entity.`);
    }
  }

  public start(serverUpdateRate: number) {
    this.updateRateHz = serverUpdateRate;

    this.stop();

    if (serverUpdateRate > 0) {
      this.updateInterval = new IntervalRunner(() => this.update(), 1000 / this.updateRateHz);
      this.updateInterval.start();
    }
  }

  public stop() {
    if (this.updateInterval != null && this.updateInterval.isRunning()) {
      this.updateInterval.stop();
    }
  }

  public getLastProcessedInputForClient(clientId: string) {

    const client = this.clients.get(clientId);
    if (client != null) {
      return client.lastProcessedInput;
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

  protected abstract getIdForNewClient(): string;

  protected abstract getStatesToBroadcastToClients(): EntityStateBroadcastMessage<PickStateType<M>>[];

  protected abstract validateInput(entity: SyncableEntity<any, any>, input: any): boolean;

  private update() {
    this.processInputs();
    this.sendWorldState();

    this.eventEmitter.emit("synchronized");
  }

  /**
   * Processes all available inputs.
   */
  private processInputs() {
    const getClientWithReadyInput = (): ClientInfo<M> | undefined => {
      for (const client of this.clients.values()) {
        if (client.connection.hasNext()) {
          return client;
        }
      }

      return undefined;
    }

    // tslint:disable-next-line:no-constant-condition
    while (true) {
      const client = getClientWithReadyInput();
      if (client == null) {
        break;
      }

      const input = client.connection.receive();
      const entity = this.entities.getEntityById(input.entityId);

      // Client sent an input for an entity it does not own.
      if (!client.ownedEntityIds.includes(input.entityId)) {
        continue;
      }

      if (entity != undefined && this.validateInput(entity, input.input)) {

        entity.state = entity.calcNextStateFromInput(entity.state, input.input);

        client.lastProcessedInput = input.inputSequenceNumber;
      }
    }
  }

  private sendWorldState() {
    const stateMessages = this.getStatesToBroadcastToClients();
    const clients = Array.from(this.clients.values());

    for (const client of clients) {
      for (const stateMessage of stateMessages) {
        const entityBelongsToClient = client.ownedEntityIds.includes(stateMessage.entityId);

        const networkedStateMessage: StateMessageFromEntityMap<M> = {
          kind: EntityMessageKind.State,
          entityId: stateMessage.entityId,
          state: stateMessage.state,
          lastProcessedInputSequenceNumber: client.lastProcessedInput,
          entityBelongsToRecipientClient: entityBelongsToClient
        };

        client.connection.send(networkedStateMessage);
      }
    }
  }
}

export interface ClientInfo<M extends EntityTypeMap> {
  clientId: string;
  connection: ServerEntityMessageBuffer<PickInputType<M>, PickStateType<M>>;
  lastProcessedInput: number;
  ownedEntityIds: string[];
}