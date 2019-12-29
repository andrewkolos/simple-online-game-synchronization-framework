import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { EventEmitter } from 'typed-event-emitter';
import { NumericObject } from '../../interpolate-linearly';
import { ServerEntitySyncer, OnServerSynchronizedEvent } from './server-entity-synchronizer';

export class ServerEntitySyncerRunner<Input, State extends NumericObject> extends EventEmitter {

  public readonly onSynchronized = this.registerEvent<(e: OnServerSynchronizedEvent<Input, State>) => void>();

  private updateInterval?: IntervalTaskRunner;

  public constructor(private readonly synchronizer: ServerEntitySyncer<Input, State>) {
    super();
    synchronizer.onSynchronized((e) => this.emit(this.onSynchronized, e));
  }

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
    this.synchronizer.synchronize();
  }
}
