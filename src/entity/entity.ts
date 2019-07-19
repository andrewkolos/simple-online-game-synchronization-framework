/**
 * Represents any entity in the game, physical. All entities together compose the state of physical entities within a game.
 */
export abstract class Entity<Input extends {}, State extends {}> {

  /**
   * The kind, or type, of the entity. Identifies the type of this entity (e.g. `PlayerSoldier` vs `PlayerMissile`).
   */
  public readonly abstract kind: string;

  public state: State;

  constructor(public readonly id: string, initialState: State) {
    this.state = initialState;
  }

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

export type AnyEntity = Entity<{}, {}>;

export type PickInput<E> = E extends Entity<infer I, any> ? I : never;
export type PickState<E> = E extends Entity<any, infer S> ? S : never;