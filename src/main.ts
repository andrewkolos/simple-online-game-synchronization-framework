/*tslint:disable */
import { TypedEventEmitter } from "@elderapo/typed-event-emitter";
import { Timer } from './timer';
import { StateMessage, InputMessage, Timestamp, ServerConnection, ClientConnection, Message } from './network';

export type EntityId = string;

/**
 * Represents any object in the game, physical or abstract. All objects together
 * encode the game state.
 */
export abstract class GameEntity {
  constructor(public readonly id: EntityId) {}
  //public abstract applyInput(input: Object): void;
  public abstract interpolate(state1: this, state2: this, timeRatio: number): void;
}

type GameEngineEvents = {
  preStep: void | undefined;
  postStep: void | undefined;
}

/**
 * Contains all state and game logic for a game.
 */
export abstract class GameEngine {
  /** These compose the state of the game. */
  private entities: Map<EntityId, GameEntity> = new Map();
  private stepTimer: Timer = new Timer(this._step.bind(this));
  private eventEmitter = new TypedEventEmitter<GameEngineEvents>();

  /**
   * Listen for a game event.
   */
  public readonly on = this.eventEmitter.on;

  /**
   * Starts the game.
   * @param updateRateHz How often the game should advance its state.
   */
  public start(updateRateHz: number) {
    this.stepTimer.start(updateRateHz);
  }

  /**
   * Game state stops advancing. State is unaffected.
   */
  public stop(): void {
    this.stepTimer.stop();
  }

  public isRunning = () => this.stepTimer.isRunning();

  public addObject(object: GameEntity) {
    this.entities.set(object.id, object);
  }

  public getEntityById(id: EntityId): GameEntity | undefined {
    return this.entities.get(id);
  }

  public getEntities(): Array<GameEntity> {
    return Array.from(this.entities.values());
  }

  public abstract applyInput(entityId: EntityId, input: Object): void;

  /**
   * Advances game state.
   */
   private _step(): void {
     this.eventEmitter.emit('preStep', undefined);
     this.step();
     this.eventEmitter.emit('postStep', undefined);
   }

   protected abstract step(): void;
}

export interface EntityFactory {
  fromStateMessage(message: StateMessage): GameEntity;
}

export interface InputForEntity {
  /**
   * The entity should react to the input.
   */
  entityId: EntityId;
  /**
   * Communicates to the client/server the intent of this input
   * and what to expect in the payload.
   */
  inputType: string;
  payload: Object;
}
/**
 * Collects inputs for a game step.
 */
export interface InputCollector {
  /**
   * 
   * @param dt The duration for which to assume all currently actuated inputs
   * have been actuated. For example, if the player/AI is currently holding down right
   * on their gamepad and dt = 300, we assume that they were holding right for the full
   * 300 ms.
   * @remarks One could argue that having scheme of passing a time delta isn't great. For
   * one thing, it is prone to hiccups. For example, if the user taps a button for only a few ms,
   * but that caller hiccups or slows down, they might end up requesting inputs with a very long
   * dt, causing the button input to be treated as being held down for a long time.
   * However, with JavaScript being single-threaded, I'm not sure what we can do here. The current 
   * scheme is nice for its simplicity.
   * @returns A collection of inputs paired with the entities they are meant
   * to be applied against.
   */
  getInputs(dt: number): InputForEntity[];
}

/**
 * Collects user inputs.
 * Translates inputs into intents specific to objects.
 * Sends intents to GameEngine on pre-tick, which will be applied on tick.
 */
export abstract class ClientGame  {
  /** Contains game state and can accept inputs. */
  private engine: GameEngine;
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
  private pendingInputs = new Array<InputMessage>();
  private lastTimestamp: number;
  private playerEntityIds: EntityId[] = [];

  private entityStateBuffers = new Map<EntityId, {timestamp: Timestamp, state: Object}[]>();

  constructor(engine: GameEngine, server: ServerConnection, entityFactory: EntityFactory, 
    serverUpdateRateInHz: number, inputCollector: InputCollector) { 
      
      this.engine = engine;
      this.server = server;
      this.entityFactory = entityFactory;
      this.serverUpdateRateInHz = serverUpdateRateInHz;
      this.inputCollector = inputCollector;

      engine.on('preStep', this.update);
  }

  public isConnected(): boolean {
    return this.playerEntityIds.length > 0;
  }

  public hasControllableEntities(): boolean {
    return this.playerEntityIds.length > 0;
  }

  public update() {
    this.processServerMessages();

    if (!this.isConnected()) return;

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
    const isFirstTimeSeeingEntity = (entityId: string) => (this.engine.getEntities().some((ge) => ge.id === entityId));

    while(this.server.hasNext()) {
      const stateMessage = this.server.receive();

      if (isFirstTimeSeeingEntity(stateMessage.entityId)) {
        const entity = this.entityFactory.fromStateMessage(stateMessage);
        this.engine.addObject(entity);
        this.entityStateBuffers.set(stateMessage.entityId, new Array());
      }

      if (this.playerEntityIds.includes(stateMessage.entityId)) { 
        // Perform server reconciliation. When the client receives an update about its entities
        // from the server, apply them, and then reapply all local pending inputs (have timestamps
        // later than the timestamp sent by the server).
        const inputsNotProcessedByServer = this.pendingInputs.filter((input: InputMessage) => {
          return input.inputSequenceNumber > stateMessage.lastProcessedInputSequenceNumber;
        });

        inputsNotProcessedByServer.forEach((input: InputMessage) => {
          const entity = this.engine.getEntityById(input.entityId);
          if (entity == null) throw Error("Did not find entity corresponding to a pending input.");

          this.engine.applyInput(input.entityId, input.payload);
        });
      } else { 
        const timestamp = +new Date();
        const stateBuffer = this.entityStateBuffers.get(stateMessage.entityId);
        if (stateBuffer == null) throw Error(`Did not find state buffer for entity with id ${stateMessage.entityId}.`)
        stateBuffer.push({timestamp, state: stateMessage.payload});
      }
    }
  }

  /**
   * Collects inputs from player (or AI), stamps them with a timestamp and sequence number,
   * sends them to the server, and applies them locally.
   */
  private processInputs(): void {
    const now = +new Date();
    const lastTimestamp = this.lastTimestamp || now;
    const timeDeltaInMs = now - lastTimestamp;
    this.lastTimestamp = now;

    const inputs = this.inputCollector.getInputs(timeDeltaInMs);

    inputs.forEach(input => {
      const inputMessage = {
        entityId: input.entityId,
        timestamp: now,
        inputSequenceNumber: this.inputSequenceNumber,
        inputType: input.inputType,
        payload: input.payload
      };

      this.server.send(inputMessage);

      const playerEntity = this.engine.getEntityById(input.entityId);

      if (playerEntity == null) throw Error(`Received input for unknown entity ${input.entityId}.`);

      this.engine.applyInput(playerEntity.id, input.payload); // Client-side prediction.

      this.pendingInputs.push(inputMessage); // Save for later reconciliation.
    });


    this.inputSequenceNumber = this.inputSequenceNumber + 1;
  }

  private interpolateEntities(): void {
    const now = +new Date();
    const renderTimestamp = now - (1000.0 / this.serverUpdateRateInHz);

    this.engine.getEntities().forEach((entity: GameEntity) => {
      if (this.playerEntityIds.includes(entity.id)) return;

      // Find the two authoritative positions surrounding the timestamp.
      const buffer = this.entityStateBuffers.get(entity.id);
      if (buffer == undefined) throw Error(`Could not find state buffer for entity ${entity.id}.`)

      // Drop older positions.
      while (buffer.length >= 2 && buffer[1].timestamp <= renderTimestamp) {
        buffer.shift();
      }

      // Get the "average" (whatever the entity's interpolation scheme decides) of the two states in which
      // the current timestamp falls in-between.
      if (buffer.length >= 2 && buffer[0].timestamp <= renderTimestamp && renderTimestamp <= buffer[1].timestamp) {
        const timeRatio = (renderTimestamp - buffer[0].timestamp) / (buffer[1].timestamp - buffer[0].timestamp);
        entity.interpolate(buffer[0].state, buffer[1], timeRatio);
      }
    });
  }
}

export abstract class ServerGame {
  
  private clients: ClientInfo[];

  private updateRateHz: number = 10;
  private updateInterval: NodeJS.Timeout;

  private game: GameEngine;

  constructor(game: GameEngine) {
    this.game = game;
  }

  public connect(connection: ClientConnection) {

    this.handlePlayerConnection();
    // Create some sort of entity for the client to control.
    // Initialize the state of the entity (e.g. spawn).
    // Add to the server representation of the game, this.game.

    const client: ClientInfo = {
      connection,
      lastProcessedInput: 0
    };

    this.clients.push(client);
  }
  
  protected abstract handlePlayerConnection(): void;

  public setUpdateRate(hz: number) {
    this.updateRateHz = hz;

    clearInterval(this.updateInterval);

    this.updateInterval = setInterval(() => this.update(), 1000 / this.updateRateHz);
  }
  
  private update() {
    this.processInputs();
    this.sendWorldState();
    
    // Fire update event, can be used for rendering/logging and such.
  }

  protected abstract validateInput(input: InputMessage): boolean;

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

    while (true) {
      const client = getClientWithReadyInput();
      if (client == null) {
        break;
      }

      const input = client.connection.receive();

      if (this.validateInput(input)) {
        const id = input.entityId;

        this.game.applyInput(id, input.payload);

        client.lastProcessedInput = input.inputSequenceNumber;
      }
    }
  }

  private sendWorldState() {
    const worldState = this.getStatesToBroadcastToClients();

    for (const client of this.clients) {
      for (const state of worldState) {
        client.connection.send({
          ...state,
          lastProcessedInputSequenceNumber: client.lastProcessedInput
        });
      }
    }
  }
 
  protected abstract getStatesToBroadcastToClients(): Message[];
}

interface ClientInfo {
  connection: ClientConnection;
  lastProcessedInput: number;
}