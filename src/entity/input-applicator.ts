import { Entity } from './entity';

export type InputApplicator<Input, State> = (entity: Entity<State>, input: Input) => State;
