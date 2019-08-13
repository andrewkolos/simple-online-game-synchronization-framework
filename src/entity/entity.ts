/**

 * Identifies a synchronizaiton strategy to use for synchronization the state
 * of a client's representation of an entity with that of the server.
 */
export const enum SyncStrategy {
  /**
   * Represents the strategy where the client simply updates the
   * entities as state messages from the server are received.
   */
  Raw = "raw",
  /**
   * Represents the strategy where the client calculates an interpolated (in-between)
   * state for an entity from it's recent past states.
   */
  Interpolation = "interpolation",
  /**
   * Represents the strategy where the client calculates the entity state
   * by predicting the current state of the entity on the server based
   * on the last state message received and how long it took to travel to the client.
   */
  DeadReckoning = "reckoning",
}

/**
 * Represents any entity in the game. All entities together compose the state of physical entities within a game.
 */
export abstract class Entity<Input, State> {

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

/**
 * Represents any entity, regardless of it's input/state types.
 */
export type AnyEntity = Entity<unknown, unknown>;

/**
 * Picks an `Entity`'s input type.
 */
export type PickInput<E extends AnyEntity> = E extends Entity<infer I, any> ? I : never;

/**
 * Picks an `Entity`'s state type.
 */
export type PickState<E extends AnyEntity> = E extends Entity<any, infer S> ? S : never;
