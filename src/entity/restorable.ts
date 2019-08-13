import { StateHistory } from 'src/synchronizers';

export type RestorationStrategy<State> = (to: number, states: StateHistory<State>) => State;

export interface Restorable<State> {
  restore(to: number, history: StateHistory<State>): void;
}
