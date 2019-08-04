export class RunningAverage {
  private _value: number = 0;
  private memory: number[] = [];
  constructor(private memorySize: number) {
  }

  public get value() {
    return this._value;
  }

  private get count() {
    return this.memory.length;
  }

  public add(newVal: number): this {

    if (this.memory.length === this.memorySize) {
      const weightedValue = (ofValue: number) => {
        return 1 / this.count * ofValue;
      };
      const toBeDeleted = this.memory[0];
      this._value = this._value - weightedValue(toBeDeleted) + weightedValue(newVal);
    } else {
      const countAfterAddition = this.count + 1;
      this._value = (this.value * this.count + newVal) / countAfterAddition
      this.memory.push(newVal);
    }

    return this;
  }
}
