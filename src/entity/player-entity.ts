import { Entity } from 'src/entity/entity';
import { PlayerControllable } from './player-controllable';

export abstract class PlayerEntity<Input, State> extends Entity<State> implements PlayerControllable<Input> {

  /**
   * Applies an input to this entity, mutating its state.
   * @param input The input to apply.
   */
  public applyInput(input: Input): void {
    this.state = this.calcNextStateFromInput(this.state, input);
  }

  /**
   * Calculates the state the entity should take on given an input.
   * @param currentState The current state of the entity.
   * @param input The input to be applied to the entity.
   * @returns The next state the entity should take on given an input.
   */
  protected abstract calcNextStateFromInput(currentState: State, input: Input): State;

}

/**
 * Represents any entity, regardless of it's input/state types.
 */
export type AnyPlayerEntity = PlayerEntity<unknown, unknown>;

/**
 * Picks an `Entity`'s input type.
 */
export type PickInput<E extends AnyPlayerEntity> = E extends PlayerEntity<infer I, any> ? I : never;
