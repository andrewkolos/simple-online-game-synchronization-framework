import { ServerSyncable, SyncToServerStrategy } from './synchronizable';
import { StateMessage } from 'src/networking';

/**
 * Represents any entity in the game. All entities together compose the state of physical entities within a game.
 */
export abstract class Entity<State> implements ServerSyncable<State> {

  /**
   * The kind, or type, of the entity. Identifies the type of this entity (e.g. `SoccerBall` vs `PlayerMissile`).
   */
  public readonly abstract kind: string;

  /**
   * The current state of this entity.
   */
  public state: State;

  constructor(public readonly id: string, initialState: State, private readonly syncStrategy: SyncToServerStrategy<State>) {
    this.state = initialState;
  }

  public synchronizeToServer(message: StateMessage<State>): void {
    this.state = this.syncStrategy(message);
  }

}
