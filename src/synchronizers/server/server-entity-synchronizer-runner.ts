import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { Entity } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { TypedEventEmitter } from '../../util/event-emitter';
import { ServerEntitySyncer } from './server-entity-synchronizer';

interface ServerEvents<State> {
  synchronized(entities: ReadonlyArray<Entity<State>>): void;
}

export class ServerEntitySyncerRunner<Input, State extends NumericObject> extends TypedEventEmitter<ServerEvents<State>> {

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
    this.emit('synchronized', this.synchronizer.synchronize());
  }
}
