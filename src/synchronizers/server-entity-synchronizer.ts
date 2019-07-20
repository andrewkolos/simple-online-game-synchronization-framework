import { AnyEntity, PickState } from 'src/entity';
import { EntityCollection } from '../entity-collection';
import { TypedEventEmitter } from '../event-emitter';
import { Interval, IntervalRunner } from "../interval-runner";
import { EntityMessageKind, StateMessage } from '../networking';
import { ServerEntityMessageBuffer } from '../networking/message-buffer';

export interface ServerEntitySynchronizerEvents {
  beforeSynchronization(): void;
  synchronized(): void;
}
type ClientId = string;
// export interface EntityStateBroadcastMessage<Entity extends AnyEntity> {
//   entityId: string,
//   state: PickState<Entity>;
// }

/**
 * Creates and synchronizes game entities for clients.
 */
export abstract class ServerEntitySynchronizer<E extends AnyEntity> {

  public updateRateHz: number;

  public readonly eventEmitter: TypedEventEmitter<ServerEntitySynchronizerEvents> = new TypedEventEmitter();

  public readonly entities: EntityCollection<E>;

  private readonly clients: Map<string, ClientInfo<E>>;

  private updateInterval?: IntervalRunner;

  constructor() {
    this.clients = new Map();
    this.entities = new EntityCollection();
    this.updateRateHz = 10;
  }

  public connect(connection: ServerEntityMessageBuffer<E>): ClientId {

    const newClientId = this.getIdForNewClient();

    const client: ClientInfo<E> = {
      clientId: newClientId,
      connection,
      lastProcessedInput: 0,
      ownedEntityIds: []
    };

    this.clients.set(newClientId, client);

    this.handleClientConnection(newClientId);

    return newClientId;
  }

  public getEntities(): ReadonlyArray<E> {
    return this.entities.asArray();
  }

  public addNonPlayerEntity(entity: E) {
    this.entities.addEntity(entity);
  }

  public addPlayerEntity(entity: E, playerClientId: string) {
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
      this.updateInterval = new IntervalRunner(() => this.update(), Interval.fromHz(this.updateRateHz));
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

  protected abstract getIdForNewClient(): ClientId;

  protected abstract validateInput(entity: E, input: any): boolean;

  private update() {
    this.eventEmitter.emit("beforeSynchronization");

    this.processInputs();
    this.sendWorldState();

    this.eventEmitter.emit("synchronized");
  }

  /**
   * Processes all available inputs.
   */
  private processInputs() {
    const getClientWithReadyInput = (): ClientInfo<E> | undefined => {
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

        entity.applyInput(input.input);

        client.lastProcessedInput = input.inputSequenceNumber;
      }
    }
  }

  private sendWorldState() {
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
          lastProcessedInputSequenceNumber: client.lastProcessedInput,
          timestampMs: new Date().getTime(),
        };

        client.connection.send(networkedStateMessage);
      });
        
      
    }
  }
}

export interface ClientInfo<E extends AnyEntity> {
  clientId: string;
  connection: ServerEntityMessageBuffer<E>;
  lastProcessedInput: number;
  ownedEntityIds: string[];
}