import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { Entity } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { TypedEventEmitter } from '../../util/event-emitter';
import { PlayerClientEntitySyncer } from './client-entity-synchronizer';

interface ClientEvents<State> {
  synchronized(entities: Array<Entity<State>>, pendingInputCount: number): void;
}

export class ClientEntitySyncerRunner<State extends NumericObject, Input> extends TypedEventEmitter<ClientEvents<State>> {

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
    this.emit('synchronized', this.synchronizer.synchronize(), this.synchronizer.getNumberOfPendingInputs());
  }
}
