/**
 * Repeatedly calls a function or executes a code snippet, with a fixed time delay between each call.
 */
export class IntervalRunner {

  private intervalId: NodeJS.Timeout | number;
  
  private running: boolean = false;

  public constructor(private readonly operation: () => void, private readonly intervalTimeMs: number) {}

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
    this.intervalId = setInterval(this.operation, this.intervalTimeMs);
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