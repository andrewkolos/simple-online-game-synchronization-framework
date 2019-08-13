import { ServerSyncable, SyncToServerStrategy } from './synchronizable';
import { StateMessage } from 'src/networking';

/**
 * Represents any entity in the game. All entities together compose the state of physical entities within a game.
 */
export abstract class Entity<State> implements ServerSyncable<State> {

  /**
   * The current state of this entity.
   */
  public state: State;

  public constructor(public readonly id: string, initialState: State, private readonly syncStrategy: SyncToServerStrategy<State>) {
    this.state = initialState;
  }

  public synchronizeToServer(message: StateMessage<State>): void {
    this.state = this.syncStrategy(message);
  }
}

/**
 * Any `Entity`, regardless of the type of it's state.
 */
export type AnyEntity = Entity<unknown>;

/**
 * Picks an `Entity`'s state type.
 */
export type PickState<E extends AnyEntity> = E extends Entity<infer S> ? S : never;
