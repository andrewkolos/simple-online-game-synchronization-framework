export type Interpolator<State> = (pastState: State, futureState: State, timeRatio: number) => State;

export interface Interpolable<State> {
  interpolate(pastState: State, futureState: State, timeRatio: number): void;
}
