import { Timer } from './timer';
import { TypedEventEmitter } from './event-emitter';
import { GameEntity } from './game-entity';

type EntityId = string;

export interface GameEngineEvents {
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

  /**
   * Determines whether the game is running.
   * @returns true if the game is running.
   */
  public isRunning() {
    return this.stepTimer.isRunning();
  }

  /**
   * Adds an entity to the game world.
   * @param entity The entity to add the the world.
   */
  public addEntity(entity: GameEntity<any, any>) {
    this.entities.set(entity.id, entity);
  }

  /**
   * Searches for an entity by ID.
   * @param id The ID of the entity to search for.
   * @returns The entity with the matching ID, if it exists.
   */
  public getEntityById(id: EntityId): GameEntity<any, any> | undefined {
    return this.entities.get(id);
  }

  /**
   * Gets all entities in the game.
   * @returns The entities in the game world.
   */
  public getEntities(): GameEntity<any, any>[] {
    return Array.from(this.entities.values());
  }

  /**
   * Updates the state of the game.
   * @param stepRateHz How often a step occurs, in hz. Use this to determine
   * how far the state should advance every step.
   */
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
