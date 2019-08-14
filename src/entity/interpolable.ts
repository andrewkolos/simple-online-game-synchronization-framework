import { StateMessage } from '../networking';
import { Interval } from '../util/interval-runner';
import { interpolateStatesLinearly, NumericObject } from '../interpolate-linearly';
import { SyncToServerStrategy } from './synchronizable';

export type Interpolator<State> = (pastState: State, futureState: State, timeRatio: number) => State;

export interface Interpolable<State> {
  interpolate(pastState: State, futureState: State, timeRatio: number): void;
}

export class InterpolationSyncStrategyFactory {

  public static withCustomInterpolator<State>(serverUpdateRateHz: number, interpolator: Interpolator<State>) {
    return new InterpolationSyncStrategy(serverUpdateRateHz, interpolator).makeStrategy();
  }

  public static withLinearInterpolator<State extends NumericObject>(serverUpdateRateHz: number): SyncToServerStrategy<State> {
    return new InterpolationSyncStrategy<State>(serverUpdateRateHz, interpolateStatesLinearly).makeStrategy();
  }
}

class InterpolationSyncStrategy<State> {
  private readonly stateMessageBuffer: Array<{ receivedAt: number, message: StateMessage<State> }> = [];

  private state: State;

  public constructor(private readonly serverUpdateRateHz: number, private readonly interpolator: Interpolator<State>) {
  }

  public makeStrategy(): SyncToServerStrategy<State> {
    return (stateMessage: StateMessage<State>) => this.calcSyncState(stateMessage);
  }

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
      return this.interpolator(buffer[0].message.entity.state, buffer[1].message.entity.state, timeRatio);
    }

    return this.state || stateMessage.entity.state;
  }
}
