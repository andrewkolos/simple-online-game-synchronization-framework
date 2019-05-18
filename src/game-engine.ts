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
