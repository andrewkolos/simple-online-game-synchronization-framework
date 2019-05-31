import { Timer } from './timer';
import { TypedEventEmitter } from './event-emitter';


export interface GameEngineEvents {
  preStep(): void
  postStep(): void
}

/**
 * Executes (game) logic at a constant rate using safe fixed time steps across
 * any hardware.
 */
export abstract class GameLoop {

  public readonly eventEmitter = new TypedEventEmitter<GameEngineEvents>();

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
