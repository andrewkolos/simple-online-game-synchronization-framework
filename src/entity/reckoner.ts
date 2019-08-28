export type Reckoner<State> = (fromState: State, reckonTimeMs: number) => State;
