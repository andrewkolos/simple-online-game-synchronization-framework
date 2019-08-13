import { Entity } from 'src/entity/entity';
import { PlayerControllable } from './player-controllable';
import { StateMessage } from 'src/networking';
import { interpolateStatesLinearly } from 'src/interpolate-linearly';
import { Interval } from 'src/util/interval-runner';

export abstract class PlayerEntity<Input, State> extends Entity<State> implements PlayerControllable<Input> {

  /**
   * The kind, or type, of the entity. Identifies the type of this entity (e.g. `SoccerBall` vs `PlayerMissile`).
   */
  public readonly abstract kind: string;

  private readonly stateMessageBuffer: Array<{ receivedAt: number, message: StateMessage<State> }> = [];

  public constructor(public readonly id: string, initialState: State, private readonly serverUpdateRateHz: number) {
    super(id, initialState, (stateMessage: StateMessage<State>) => this.calcSyncState(stateMessage));
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

  private calcSyncState(stateMessage: StateMessage<State>): State {
    const now = new Date().getTime();
    const buffer = this.stateMessageBuffer;
    const renderTimestamp = now - Interval.fromHz(this.serverUpdateRateHz).ms;

    this.stateMessageBuffer.push({
      receivedAt: now,
      message: stateMessage,
    });

    // Drop older positions.
    while (buffer.length >= 2 && buffer[1].receivedAt <= renderTimestamp) {
      buffer.shift();
    }

    // Get the "average" (whatever the entity's interpolation scheme decides) of the two states in which
    // the current receivedAt falls in-between.
    if (buffer.length >= 2 && buffer[0].receivedAt <= renderTimestamp && renderTimestamp <= buffer[1].receivedAt) {

      const timeRatio = (renderTimestamp - buffer[0].receivedAt) / (buffer[1].receivedAt - buffer[0].receivedAt);
      return interpolateStatesLinearly(buffer[0].message.entity.state, buffer[1].message.entity.state, timeRatio);
    }

    return this.state;
  }
}

/**
 * Represents any entity, regardless of it's input/state types.
 */
export type AnyEntity = PlayerEntity<unknown, unknown>;

/**
 * Picks an `Entity`'s input type.
 */
export type PickInput<E extends AnyEntity> = E extends PlayerEntity<infer I, any> ? I : never;

/**
 * Picks an `Entity`'s state type.
 */
export type PickState<E extends AnyEntity> = E extends PlayerEntity<any, infer S> ? S : never;
