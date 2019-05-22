export type TickHandler = (tickNumber: number) => void;

/**
 * A simple timer utility.
 */
export class Timer {

  /**
   * How long the timer has been running.
   */
  private tickCount: number = 0;

  private updateIntervalId?: NodeJS.Timer;
  private tickHandler: TickHandler;

  /**
   * Creates an instance of timer.
   * @param tickHandler The function that will be called every ti
   */
  constructor(tickHandler: TickHandler) {
    this.tickHandler = tickHandler;
  }

  /**
   * Starts the timer.
   * @param tickRateHz How often the timer should tick. 
   */
  public start(tickRateHz: number) {
    this.stop();
    this.updateIntervalId = setInterval(() => this.tick(),
      1000 / tickRateHz)
  }

  /**
   * Determines whether the timer is running.
   * @returns true if running.
   */
  public isRunning(): boolean {
    return this.updateIntervalId != undefined;
  }

  /**
   * Stops timer.
   */
  public stop() {
    if (this.updateIntervalId != undefined) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = undefined;
    }
  }

  private tick() {
    this.tickCount += 1;
    this.tickHandler(this.tickCount);
  }
}
