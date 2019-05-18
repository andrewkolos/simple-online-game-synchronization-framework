import { GameEntity } from './game-entity';
import { GameEngine } from './game-engine';
import { InputMessage, ServerConnection, Timestamp } from './networking/connection';

type EntityId = string;

export interface EntityFactory {
  fromStateMessage(entityId: string, state: any): GameEntity<any, any>;
}

export interface InputForEntity {
  /**
   * The entity should react to the input.
   */
  entityId: EntityId;
  input: Object;
}
/**
 * Collects inputs for a game step.
 */
export interface InputCollector {
  /**
   * @returns A collection of inputs paired with the entities they are meant
   * to be applied against.
   */
  getInputs(): InputForEntity[];
}

/**
 * Collects user inputs.
 * Translates inputs into intents specific to objects.
 * Sends intents to GameEngine on pre-tick, which will be applied on tick.
 */
export class GameClient<Game extends GameEngine>  {
  /** Contains game state and can accept inputs. */
  private engine: Game;
  /** Provides state messages. */
  private server: ServerConnection;
  /** Constructs representations of new entities given a state object. */
  private entityFactory: EntityFactory;
  private serverUpdateRateInHz: number;
  /** Collects user inputs. */
  private inputCollector: InputCollector;

  private inputSequenceNumber = 0;
  /**
   * Inputs with sequence numbers later than that of the last server message received.
   */
  private pendingInputs: InputMessage[] = [];
  private playerEntityIds: EntityId[] = [];

  private entityStateBuffers = new Map<EntityId, { timestamp: Timestamp; state: Object }[]>();

  public get numberOfPendingInputs() {
    return this.pendingInputs.length;
  }

  constructor(engine: Game, server: ServerConnection, entityFactory: EntityFactory,
    serverUpdateRateInHz: number, inputCollector: InputCollector) {

    this.engine = engine;
    this.server = server;
    this.entityFactory = entityFactory;
    this.serverUpdateRateInHz = serverUpdateRateInHz;
    this.inputCollector = inputCollector;

    engine.eventEmitter.on('preStep', () => {
      this.update();
    });
  }

  public startGame(updateRateHz: number) {
    this.engine.start(updateRateHz);
  }

  public stopGame() {
    this.engine.stop();
  }

  public isConnected(): boolean {
    return this.playerEntityIds.length > 0;
  }

  public hasControllableEntities(): boolean {
    return this.playerEntityIds.length > 0;
  }

  public update() {
    this.processServerMessages();

    if (!this.isConnected()) { return; }

    this.processInputs();

    this.interpolateEntities();
  }

  /**
   * Process all new messages sent by the server.
   * Add new entities, update our player-controlled entities to have the state sent by the server, then reapply
   * pending inputs that have yet to be acknowledged by the server.
   * 
   */
  private processServerMessages() {
    const isFirstTimeSeeingEntity = (entityId: string) => !this.engine.getEntities().some((ge) => ge.id === entityId);

    while (this.server.hasNext()) {
      const stateMessage = this.server.receive();

      if (isFirstTimeSeeingEntity(stateMessage.entityId)) {
        const entity = this.entityFactory.fromStateMessage(stateMessage.entityId, stateMessage.state);
        if (entity.id !== stateMessage.entityId) {
          throw Error(`Entity created by entity factory has an incorrect id: ${entity.id} != ${stateMessage.entityId}`);
        }
        this.engine.addObject(entity);
        this.entityStateBuffers.set(stateMessage.entityId, []);

        if (stateMessage.entityBelongsToRecipientClient) {
          this.playerEntityIds.push(stateMessage.entityId);
        }
      }

      if (this.playerEntityIds.includes(stateMessage.entityId)) {
        const entity = this.engine.getEntityById(stateMessage.entityId);

        if (entity == null) throw Error('Unknown entity was not created.');

        entity.state = stateMessage.state; // Received authoritative position for our entity.

        // Perform server reconciliation. When the client receives an update about its entities
        // from the server, apply them, and then reapply all local pending inputs (have timestamps
        // later than the timestamp sent by the server).
        this.pendingInputs = this.pendingInputs.filter((input: InputMessage) => {
          return input.inputSequenceNumber > stateMessage.lastProcessedInputSequenceNumber;
        });

        this.pendingInputs.forEach((inputMessage: InputMessage) => {
          const entity = this.engine.getEntityById(inputMessage.entityId);
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
    const inputs = this.inputCollector.getInputs();

    inputs.forEach(input => {
      const inputMessage = {
        entityId: input.entityId,
        timestamp: now,
        inputSequenceNumber: this.inputSequenceNumber,
        input: input.input
      };

      this.server.send(inputMessage);

      const playerEntity = this.engine.getEntityById(input.entityId);

      if (playerEntity == undefined) { throw Error(`Received input for unknown entity ${input.entityId}.`); }

      playerEntity.state = playerEntity.calcNextStateFromInput(playerEntity.state, input.input); // Client-side prediction.

      this.pendingInputs.push(inputMessage); // Save for later reconciliation.
    });

    if (inputs.length > 0) {
      this.inputSequenceNumber = this.inputSequenceNumber + 1;
    }
  }

  private interpolateEntities(): void {
    const now = new Date().getTime();
    const renderTimestamp = now - (1000.0 / this.serverUpdateRateInHz);

    this.engine.getEntities().forEach((entity: GameEntity<any, any>) => {
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