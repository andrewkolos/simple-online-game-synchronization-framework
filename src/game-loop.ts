import { EventEmitter } from 'typed-event-emitter';

export type TickHandler = (tickNumber: number) => void;

export interface GameLoopEvents {
  preStep(): void;
  postStep(): void;
}

/**
 * Executes (game) logic at a constant rate using safe fixed time steps across
 * any hardware.
 */
export class GameLoop extends EventEmitter {

  public readonly onPreStep = this.registerEvent<() => void>();
  public readonly onPostStep = this.registerEvent<() => void>();

  public get tickRateHz(): number {
    return this._tickRateHz;
  }

  private _tickRateHz: number;

  /** How many ticks the timer has counted. */
  private tickCount: number = 0;
  private tickIntervalId?: NodeJS.Timer;
  private readonly tickHandler: TickHandler;

  public constructor(tickHandler: TickHandler) {
    super();
    this.tickHandler = tickHandler;
  }

  /**
   * Starts the game.
   * @param stepRateHz How often the game should advance its state.
   */
  public start(stepRateHz: number) {
    this.stop();
    this.tickIntervalId = setInterval(() => this.tick(), 1 / stepRateHz * 1000) as any;
    this._tickRateHz = stepRateHz;
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
    this.emit(this.onPreStep);
    this.tickCount += 1;
    this.tickHandler(this.tickCount);
    this.emit(this.onPostStep);
  }
}
