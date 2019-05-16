import { TypedEventEmitter } from './eventer-emitter';
import { ClientConnection, InputMessage, ServerConnection, Timestamp } from './network';
import { Timer } from './timer';

type EntityId = string;

/**
 * Represents any object in the game, physical or abstract. All objects together
 * encode the game state.
 */
export abstract class GameEntity<Input, State> {

  public state: State;

  public readonly id: EntityId;

  constructor(id: EntityId, initialState: State) {
    this.id = id;
    this.state = initialState;
  }

  public abstract validateInput(currentState: State, input: Input): boolean;
  public abstract calcNextStateFromInput(currentState: State, input: Input): State;
  public abstract interpolate(state1: State, state2: State, timeRatio: number): State;
}

interface GameEngineEvents {
  preStep(): void
  postStep(): void
}

/**
 * Contains all state and game logic for a game.
 */
export abstract class GameEngine {

  public readonly eventEmitter = new TypedEventEmitter<GameEngineEvents>();
  /** These compose the state of the game. */
  private entities: Map<EntityId, GameEntity<any, any>> = new Map();
  private stepTimer: Timer = new Timer(this._step.bind(this));
  private stepRateHz: number;

  /**
   * Starts the game.
   * @param stepRateHz How often the game should advance its state.
   */
  public start(stepRateHz: number) {
    this.stepRateHz = stepRateHz;
    this.stepTimer.start(stepRateHz);
  }

  /**
   * Game state stops advancing. State is unaffected.
   */
  public stop(): void {
    this.stepTimer.stop();
  }

  public isRunning() {
    return this.stepTimer.isRunning();
  }

  public addObject(object: GameEntity<any, any>) {
    this.entities.set(object.id, object);
  }

  public getEntityById(id: EntityId): GameEntity<any, any> | undefined {
    return this.entities.get(id);
  }

  public getEntities(): GameEntity<any, any>[] {
    return Array.from(this.entities.values());
  }

  protected abstract step(stepRateHz: number): void;

  /**
   * Advances game state.
   */
  // tslint:disable-next-line:function-name
  private _step(): void {
    this.eventEmitter.emit('preStep');
    this.step(this.stepRateHz);
    this.eventEmitter.emit('postStep');
  }
}

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
export class ClientGame<Game extends GameEngine>  {
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

  constructor(engine: Game, server: ServerConnection, entityFactory: EntityFactory,
    serverUpdateRateInHz: number, inputCollector: InputCollector) {

    this.engine = engine;
    this.server = server;
    this.entityFactory = entityFactory;
    this.serverUpdateRateInHz = serverUpdateRateInHz;
    this.inputCollector = inputCollector;

    engine.eventEmitter.on('preStep', () => this.update());
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
        this.engine.addObject(entity);
        this.entityStateBuffers.set(stateMessage.entityId, []);
      }

      if (this.playerEntityIds.includes(stateMessage.entityId)) {
        // Perform server reconciliation. When the client receives an update about its entities
        // from the server, apply them, and then reapply all local pending inputs (have timestamps
        // later than the timestamp sent by the server).
        const inputsNotProcessedByServer = this.pendingInputs.filter((input: InputMessage) => {
          return input.inputSequenceNumber > stateMessage.lastProcessedInputSequenceNumber;
        });

        inputsNotProcessedByServer.forEach((inputMessage: InputMessage) => {
          const entity = this.engine.getEntityById(inputMessage.entityId);
          if (entity == null) { throw Error("Did not find entity corresponding to a pending input."); }

          entity.state = entity.calcNextStateFromInput(entity.state, inputMessage.input);
        });
      } else {
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
    const now = +new Date();
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

      playerEntity.calcNextStateFromInput(playerEntity.state, input.input); // Client-side prediction.

      this.pendingInputs.push(inputMessage); // Save for later reconciliation.
    });


    this.inputSequenceNumber = this.inputSequenceNumber + 1;
  }

  private interpolateEntities(): void {
    const now = +new Date();
    const renderTimestamp = now - (1000.0 / this.serverUpdateRateInHz);

    this.engine.getEntities().forEach((entity: GameEntity<any, any>) => {
      if (this.playerEntityIds.includes(entity.id)) { return; }

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
        entity.state = entity.interpolate(buffer[0], buffer[1], timeRatio);
      }
    });
  }
}

export abstract class ServerGame<Game extends GameEngine> {

  public updateRateHz: number;

  public game: Game;

  private clients: ClientInfo[];

  private updateInterval: NodeJS.Timeout;

  constructor(game: Game) {
    this.clients = [];
    this.game = game;
    this.updateRateHz = 10;
  }

  public connect(connection: ClientConnection): string {

    // Create some sort of entity for the client to control.
    // Initialize the state of the entity (e.g. spawn).
    // Add to the server representation of the game, this.game.

    const newClientId = `${this.clients.length}`;
    const client: ClientInfo = {
      clientId: newClientId,
      connection,
      lastProcessedInput: 0
    };

    this.handlePlayerConnection(newClientId);

    this.clients.push(client);

    return newClientId;
  }

  public startServer(hz: number) {
    this.updateRateHz = hz;

    clearInterval(this.updateInterval);

    this.updateInterval = setInterval(() => this.update(), 1000 / this.updateRateHz);
  }

  protected abstract handlePlayerConnection(newClientId: string): void;

  protected abstract getStatesToBroadcastToClients(): { entityId: string; state: any }[];

  private update() {
    this.processInputs();
    this.sendWorldState();

    // Fire update event, can be used for rendering/logging and such.
  }

  /**
   * Processes all available inputs.
   */
  private processInputs() {
    const getClientWithReadyInput = (): ClientInfo | undefined => {
      for (const client of this.clients) {
        if (client.connection.hasNext()) {
          return client;
        }
      }

      return undefined;
    }

    // tslint:disable-next-line:no-constant-condition
    while (true) {
      const client = getClientWithReadyInput();
      if (client == undefined) {
        break;
      }

      const input = client.connection.receive();
      const entity = this.game.getEntityById(input.entityId);

      if (entity != undefined && entity.validateInput(entity.state, input.input)) {

        entity.calcNextStateFromInput(entity.state, input.input);

        client.lastProcessedInput = input.inputSequenceNumber;
      }
    }
  }

  private sendWorldState() {
    const stateMessages = this.getStatesToBroadcastToClients();

    for (const client of this.clients) {
      for (const stateMessage of stateMessages) {
        client.connection.send({
          entityId: stateMessage.entityId,
          state: stateMessage.state,
          lastProcessedInputSequenceNumber: client.lastProcessedInput
        });
      }
    }
  }
}

export interface ClientInfo {
  clientId: string;
  connection: ClientConnection;
  lastProcessedInput: number;
}