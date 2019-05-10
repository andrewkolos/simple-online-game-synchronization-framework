export class Timer {

  private time: number = 0;

  private updateIntervalId?: NodeJS.Timer;
  private tickHandler: TickHandler;

  constructor(tickHandler: TickHandler) {
    this.tickHandler = tickHandler;
  }

  public start(updateRateHz: number) {
    this.stop();
    this.updateIntervalId = setInterval(() => this.tick(),
      1000 / updateRateHz)
  }

  public isRunning(): boolean {
    return this.updateIntervalId != undefined;
  }

  public stop() {
    if (this.updateIntervalId != undefined) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = undefined;
    }
  }

  private tick() {
    this.tickHandler(this.time);
  }
}

export type TickHandler = (tickNumber: number) => void;