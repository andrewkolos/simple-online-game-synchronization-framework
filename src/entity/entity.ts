export type EntityId = string;

/**
 * Represents any entity in the game. All entities together compose the state of physical entities within a game.
 */
export interface Entity<State> {
  /**
   * The unique ID of this entity.
   */
  id: EntityId;
  /**
   * The state of this entity.
   */
  state: State;
}

/**
 * Any `Entity`, regardless of the type of it's state.
 */
export type AnyEntity = Entity<unknown>;

/**
 * Picks an `Entity`'s state type.
 */
export type PickState<E extends AnyEntity> = E extends Entity<infer S> ? S : never;
