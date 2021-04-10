export class Stopwatch {
  private lastTime: number;

  public reset(): number {
    const now = new Date().getTime();
    if (this.lastTime == null) {
      this.lastTime = now;
    }
    const timeSinceLastReset = now - this.lastTime;
    this.lastTime = now;

    return timeSinceLastReset;
  }
}