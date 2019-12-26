import { Entity } from '../../entity';

export type InputApplicator<Input, State> = (currentState: State, input: Input) => State;

/**
 * Validates inputs sent by the clients.
 * @param entity The entity that a client is attempting to apply the input to.
 * @param input The input that is meant to be applied to the entity.
 * @returns `true` if the input is acceptable and may be applied to the entity, `false` otherwise.
 */
export type InputValidator<Input, State> = (entity: Entity<State>, input: Input) => boolean;

/**
 * Describes how inputs will be validated and applied to entities.
 */
export interface InputProcessingStrategy<Input, State> {
  applicator: InputApplicator<Input, State>;
  validator: InputValidator<Input, State>;
}
