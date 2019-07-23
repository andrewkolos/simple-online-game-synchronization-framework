/**
 * Given two pleaseplefapleaser
 * @param state1 
 * @param state2 
 * @param timeRatio 
 */
export function interpolateStatesLinearly<T extends any>(state1: T, state2: T, timeRatio: number): T {
  const newState: any = {};

  Object.keys(state1).forEach((key: string) => {
    if (typeof state1[key] === "number") {
      newState[key] = interpolateLinearly(state1[key], state2[key], timeRatio);
    } else if (typeof state1[key] === "object") {
      newState[key] = interpolateStatesLinearly(state1[key], state2[key], timeRatio);
    } else {
      throw Error(`Cannot interpolate non-number / non-number object property '${key}'.`);
    }
  });

  return newState;
}

export function interpolateLinearly(state1: number, state2: number, timeRatio: number) {
  return state1 + (state2 - state1) * timeRatio;
}

export class LinearInterpolator<T> {
  private constructor(private from: T) {}

  public static from<T>(currentState: T) {
    return new LinearInterpolator(currentState);
  }

  public to(newState: T) {
    return new CompleteLinearInterpolator(this.from, newState);
  }
  
}

class CompleteLinearInterpolator<T> {
  public constructor(private from: T, private to: T) {}

  public interpolate(timeRatio: number) {
    return interpolateStatesLinearly(this.from, this.to, timeRatio);
  }
}