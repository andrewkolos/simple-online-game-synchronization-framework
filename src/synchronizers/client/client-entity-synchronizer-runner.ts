import { InheritableEventEmitter } from '@akolos/event-emitter';
import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { Entity } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { PlayerClientEntitySyncer } from './player-client-entity-synchronizer';

export interface ClientEntitySyncerRunnerEvents<State> {
  synchronized: [entities: Array<Entity<State>>, pendingInputCount: number];
}

export class ClientEntitySyncerRunner<Input, State extends NumericObject> extends InheritableEventEmitter<ClientEntitySyncerRunnerEvents<State>> {

  private updateInterval?: IntervalTaskRunner;

  public constructor(public readonly synchronizer: PlayerClientEntitySyncer<Input, State>) { super(); }

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
