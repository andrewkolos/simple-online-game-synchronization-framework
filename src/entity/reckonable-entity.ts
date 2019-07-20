import { Entity } from './entity';

/**
 * Represents any object in the game, physical or abstract. All objects together
 * encode the game state.
 */
export abstract class ReckonableEntity<Input, State> extends Entity<Input, State> {

  public abstract calcReckonedState(previousState: State, timeElapsedSincePreviousStateMs: number): State;

  public reckon(timeMs: number) {
    this.state = this.calcReckonedState(this.state, timeMs);
  }
}

export type AnyReckonableEntity = ReckonableEntity<unknown, unknown>;