export type Reckoner<State> = (fromState: State, reckonTimeMs: number) => State;

export interface Reckonable<State> {
  calcReckonedState(fromState: State, reckonTimeMs: number): void;
}
