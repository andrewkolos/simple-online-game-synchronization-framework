export type Interpolator<State> = (pastState: State, futureState: State, timeRatio: number) => State;
