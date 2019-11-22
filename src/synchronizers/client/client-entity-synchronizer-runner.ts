import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { EventEmitter } from 'typed-event-emitter';
import { Entity } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { PlayerClientEntitySyncer } from './player-client-entity-synchronizer';

type OnSynchronizedHandler<State> = (entities: Array<Entity<State>>, pendingInputCount: number) => void;

export class ClientEntitySyncerRunner<State extends NumericObject, Input> extends EventEmitter {

  public readonly onSynchronized = this.registerEvent<OnSynchronizedHandler<State>>();

  private updateInterval?: IntervalTaskRunner;

  public constructor(public readonly synchronizer: PlayerClientEntitySyncer<State, Input>) { super(); }

  public start(updateRateHz: number) {
    this.stop();
    this.updateInterval = new IntervalTaskRunner(() => this.update(), Interval.fromHz(updateRateHz));
    this.updateInterval.start();
  }

  public stop() {
    if (this.updateInterval != null && this.updateInterval.isRunning()) {
      this.updateInterval.stop();
    }
  }

  private update() {
    this.emit(this.onSynchronized, this.synchronizer.synchronize(), this.synchronizer.getNumberOfPendingInputs());
  }
}
