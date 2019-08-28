import { StateMessage } from '../networking';
import { Interpolator, InterpolationSyncStrategyFactory } from './interpolator';
import { Reckoner } from './reckoner';
import { NumericObject } from '../interpolate-linearly';

export type SyncToServerStrategy<State> = (stateMessage: StateMessage<State>) => State;

export namespace SyncToServerStrategyFactory {

  export function linearInterpolation<State extends NumericObject>(serverUpdateRateHz: number): SyncToServerStrategy<State> {
    return InterpolationSyncStrategyFactory.withLinearInterpolator(serverUpdateRateHz);
  }

  export function customInterpolation<State>(serverUpdateRateHz: number, interpolator: Interpolator<State>): SyncToServerStrategy<State> {
    return InterpolationSyncStrategyFactory.withCustomInterpolator(serverUpdateRateHz, interpolator);
  }

  export function deadReckoning<State>(reckoner: Reckoner<State>): SyncToServerStrategy<State> {
    return (stateMessage: StateMessage<State>) => reckoner(stateMessage.entity.state, new Date().getTime() - stateMessage.sentAt);
  }
}
