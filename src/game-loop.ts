import { TypedEventEmitter } from './event-emitter';

export type TickHandler = (tickNumber: number) => void;


export interface GameEngineEvents {
  preStep(): void
  postStep(): void
}

/**
 * Executes (game) logic at a constant rate using safe fixed time steps across
 * any hardware.
 */
export class GameLoop {

  public readonly eventEmitter = new TypedEventEmitter<GameEngineEvents>();

  public tickRateHz: number;
  
  /** How many ticks the timer has counted. */
  private tickCount: number = 0;
  private tickIntervalId?: NodeJS.Timer;
  private tickHandler: TickHandler  

  public constructor(tickHandler: TickHandler) {
    this.tickHandler = tickHandler;
  }

  /**
   * Starts the game.
   * @param stepRateHz How often the game should advance its state.
   */
  public start(stepRateHz: number) {
    this.stop();
    this.tickIntervalId = setInterval(() => this.tick()) as any;
    this.tickRateHz = stepRateHz;
  }

  /**
   * Game state stops advancing. State is unaffected.
   */
  public stop(): void {
    if (this.tickIntervalId != null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = undefined;
    }
  }

  /**
   * Determines whether the game is running.
   * @returns true if the game is running.
   */
  public isRunning() {
    return this.tickIntervalId != undefined;
  }

  private tick() {
    this.eventEmitter.emit('preStep');
    this.tickCount += 1;
    this.tickHandler(this.tickCount);
    this.eventEmitter.emit('postStep');
  }
}
