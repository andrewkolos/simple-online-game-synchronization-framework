import { singleLineify } from './singleLineify';

export class MovingAverage {
  private _value = 0;
  private count = 0;
  constructor(private numberOfSamplesToAverageOver: number) {
    if (numberOfSamplesToAverageOver < 1) {
      throw RangeError(singleLineify`
        Number of samples to average over must be at least 1. Received ${String(numberOfSamplesToAverageOver)}.
      `);
    }
  }

  public get value() {
    return this._value;
  }

  public add(val: number, ...more: number[]): this {

    const vals: number[] = [val, ...more];

    const sumVals = vals.reduce((p: number, c: number) => p + c);

    const n = (Math.min(this.numberOfSamplesToAverageOver, this.count + vals.length));
    this._value = this._value * (n - vals.length) / n + sumVals / n;

    this.count += vals.length;

    return this;
  }
}
