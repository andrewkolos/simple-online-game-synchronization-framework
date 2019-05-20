type EntityId = string;

/**
 * Represents any object in the game, physical or abstract. All objects together
 * encode the game state.
 */
export abstract class GameEntity<Input, State> {

  public state: State;

  public readonly id: EntityId;

  constructor(id: EntityId, initialState: State) {
    this.id = id;
    this.state = initialState;
  }
  
  public abstract calcNextStateFromInput(currentState: State, input: Input): State;
  public abstract interpolate(state1: State, state2: State, timeRatio: number): State;
}
