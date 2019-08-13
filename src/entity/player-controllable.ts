
export type InputApplicator<Input, State> = (currentState: State, input: Input) => State;

export interface PlayerControllable<Input> {
  applyInput(input: Input): void;
}
