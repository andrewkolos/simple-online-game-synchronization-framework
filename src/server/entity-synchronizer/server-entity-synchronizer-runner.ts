import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { EventEmitter } from 'typed-event-emitter';
import { Entity } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { ServerEntitySyncer } from './server-entity-synchronizer';

export class ServerEntitySyncerRunner<Input, State extends NumericObject> extends EventEmitter {

  public readonly onSynchronized = this.registerEvent<(entities: ReadonlyArray<Entity<State>>) => void>();

  private updateInterval?: IntervalTaskRunner;

  public constructor(public readonly synchronizer: ServerEntitySyncer<Input, State>) { super(); }

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
    this.emit(this.onSynchronized, this.synchronizer.synchronize());
  }
}
