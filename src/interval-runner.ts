export class IntervalRunner {

  private intervalId: NodeJS.Timeout | number;
  
  public running: boolean = false;

  public constructor(private operation: () => void, private intervalTimeMs: number) {}

  public start() {
    this.intervalId = setInterval(this.operation, this.intervalTimeMs);
    this.running = true;
  }

  public stop() {
    // TS compiler is unsure if we are using a Node interval or a web API interval.
    // Either is fine as both APIs are identical, so we perform a cast here.
    clearInterval(this.intervalId as NodeJS.Timeout & number);
    this.running = false;
  }
}