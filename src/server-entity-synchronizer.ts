import { ClientConnection } from './networking/connection';
import { SyncableEntity } from './syncable-entity';
import { EntityCollection } from './entity-collection';
import { TypedEventEmitter } from './event-emitter';
import { IntervalRunner } from "./interval-runner";

export interface ServerEntitySynchronizerEvents {
  synchronized(): void;
}

export interface EntityStateBroadcastMessage {
  entityId: string,
  state: any;
}

export abstract class ServerEntitySynchronizer {

  public updateRateHz: number;

  public entities: EntityCollection;

  private clients: Map<string, ClientInfo>;

  private updateInterval?: IntervalRunner;

  public eventEmitter: TypedEventEmitter<ServerEntitySynchronizerEvents> = new TypedEventEmitter();

  constructor() {
    this.clients = new Map();
    this.entities = new EntityCollection();
    this.updateRateHz = 10;
  }

  public connect(connection: ClientConnection): string {

    const newClientId = this.getIdForNewClient();

    const client: ClientInfo = {
      clientId: newClientId,
      connection,
      lastProcessedInput: 0,
      ownedEntityIds: []
    };

    this.clients.set(newClientId, client);

    this.handleClientConnection(newClientId);

    return newClientId;
  }

  public addPlayerEntity(entity: SyncableEntity<any, any>, playerClientId: string) {
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
    if (this.updateInterval != null && this.updateInterval.running) {
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

  protected abstract getStatesToBroadcastToClients(): EntityStateBroadcastMessage[];

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
    const getClientWithReadyInput = (): ClientInfo | undefined => {
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

        const networkedStateMessage = {
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

export interface ClientInfo {
  clientId: string;
  connection: ClientConnection;
  lastProcessedInput: number;
  ownedEntityIds: string[];
}