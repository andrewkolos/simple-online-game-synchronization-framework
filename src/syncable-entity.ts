type EntityId = string;

/**
 * Represents any object in the game, physical or abstract. All objects together
 * encode the game state.
 */
export abstract class SyncableEntity<Input, State> {

  /**
   * State of the game entity.
   */
  public state: State;

  /**
   * Id of the game entity.
   */
  public readonly id: EntityId;

  /**
   * Creates an instance of game entity.
   * @param id The ID this entity will have.
   * @param initialState The initial state of this entity.
   */
  constructor(id: EntityId, initialState: State) {
    this.id = id;
    this.state = initialState;
  }
  
  /**
   * Calculates the state the entity should take on given an input.
   * @param currentState The current state of the entity.
   * @param input The input to be applied to the entity.
   * @returns The next state the entity should take on given an input.
   */
  public abstract calcNextStateFromInput(currentState: State, input: Input): State;
  public abstract interpolate(state1: State, state2: State, timeRatio: number): State;
}
