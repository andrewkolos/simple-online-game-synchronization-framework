import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { EventEmitter } from 'typed-event-emitter';
import { Entity } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { ServerEntitySyncer, ClientInfo } from './server-entity-synchronizer';

type ClientId = string;

export class ServerEntitySyncerRunner<Input, State extends NumericObject> extends EventEmitter {

  public readonly onSynchronized = this.registerEvent<(entities: ReadonlyArray<Entity<State>>) => void>();

  private updateInterval?: IntervalTaskRunner;

  public constructor(private readonly synchronizer: ServerEntitySyncer<Input, State>) { super(); }

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

  public getClientInformation(): ReadonlyMap<ClientId, ClientInfo<Input, State>>;
  public getClientInformation(clientId: string): ClientInfo<Input, State>;
  public getClientInformation(clientId?: string) {
    return clientId == null ? this.synchronizer.getClientInformation() : this.synchronizer.getClientInformation(clientId);
  }

  private update() {
    this.emit(this.onSynchronized, this.synchronizer.synchronize());
  }
}
