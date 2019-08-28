export interface NumericObject {
  [key: string]: number | NumericObject;
}

export function isNumericObject(o: unknown): o is NumericObject {
  if (typeof o !== 'object' || o == null) {
    return false;
  }

  const result = Object.keys(o).every((key: string) => {
    const value = (o as any)[key];
    if (typeof value === 'object' && isNumericObject(value)) return true;
    if (typeof value === 'number') return true;
    return false;
  });

  return result;
}

/**
 * Given two states and a time ratio (0 => state1, 0.5 => halfway between, 1.0 => state2), computes
 * a simple interpolation.
 * @param state1 The first state to interpolate from.
 * @param state2 The second state to interpolate towards.
 * @param timeRatio How far the computed state should be from state1 to state2.
 */
export function interpolateStatesLinearly<T extends NumericObject>(state1: T, state2: T, timeRatio: number): T {
  const newState: any = {};

  Object.keys(state1).forEach((key: string) => {
    const state1Value = state1[key];
    const state2Value = state2[key];

    if (typeof state1Value === 'number' && typeof state2Value == 'number') {
      newState[key] = interpolateLinearly(state1Value, state2Value, timeRatio);
    } else if (typeof state1Value === 'object' && typeof state2Value === 'object') {
      newState[key] = interpolateStatesLinearly(state1Value, state2Value, timeRatio);
    } else {
      throw Error(`Cannot interpolate non-number / non-number object property '${key}'.`);
    }
  });

  return newState;
}

export function interpolateLinearly(state1: number, state2: number, timeRatio: number) {
  return state1 + (state2 - state1) * timeRatio;
}

export class LinearInterpolator<T extends NumericObject> {

  public static from<T extends NumericObject>(currentState: T) {
    return new LinearInterpolator(currentState);
  }
  private constructor(private from: T) { }

  public to(newState: T) {
    return new CompleteLinearInterpolator(this.from, newState);
  }

}

class CompleteLinearInterpolator<T extends NumericObject> {
  public constructor(private from: T, private to: T) { }

  public interpolate(timeRatio: number) {
    return interpolateStatesLinearly(this.from, this.to, timeRatio);
  }
}
