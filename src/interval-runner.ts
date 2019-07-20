/**
 * Represents an interval of time, i.e. the amount of time between two events.
 */
export class Interval {
  private constructor(public ms: number) {
  }

  public static fromMilliseconds(ms: number) {
    return new Interval(ms);
  }

  public static fromHz(hz: number) {
    return new Interval(1000 / hz);
  }
}

/**
 * Repeatedly calls a function or executes a code snippet, with a fixed time delay between each call.
 */
export class IntervalRunner {

  private intervalId: NodeJS.Timeout | number;

  private running: boolean = false;

  public constructor(private readonly operation: () => void, private readonly interval: Interval) { }

  /**
   * Determines if this runner is running.
   * @returns `true` if running, `false` otherwise.
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Starts the runner, repeatedly executing its operation using the Node/`Window` `setInterval` API.
   */
  public start() {
    this.intervalId = setInterval(this.operation, this.interval.ms);
    this.running = true;
  }

  /**
   * Stops the runner.
   */
  public stop() {
    // TS compiler is unsure if we are using a Node interval or a web API interval.
    // Either is fine as both APIs are identical, so we perform a cast here.
    clearInterval(this.intervalId as NodeJS.Timeout & number);
    this.running = false;
  }
}