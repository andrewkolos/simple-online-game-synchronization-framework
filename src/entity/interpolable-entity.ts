import { Entity } from './entity';


/**
 * An entity that interpolates ea
 * @template Input 
 * @template State 
 */
export abstract class InterpolableEntity<Input, State> extends Entity<Input, State> {
  
  /**
   * Creates a state for the entity by interpolating two other states (essentially creating
   * an in-between state). 
   * @param state1 The first, past state.
   * @param state2 The second, future state.
   * @param timeRatio A ratio of how close the state should be to the second state. A time ratio
   * of 0 would give the first state, 1 would give the second state, and 0.5 would give a state half-way
   * in-between, for example.
   * @returns The interpolated state.
   */
  public abstract calculateInterpolatedState(state1: State, state2: State, timeRatio: number): State;

  public interpolate(state1: State, state2: State, timeRatio: number) {
    this.state = this.calculateInterpolatedState(state1, state2, timeRatio);
  }
}

export type AnyInterpolableEntity = InterpolableEntity<unknown, unknown>;

