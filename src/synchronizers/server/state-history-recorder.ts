import { Entity } from '../../entity';
import { ServerEntitySyncer } from './server-entity-synchronizer';
import { TimestampedBuffer } from '../../networking';
import { EntityTargetedInput } from '../client';

interface ServerState<Input, State> {
  entities: Array<Entity<State>>;
  inputsApplied: Array<EntityTargetedInput<Input>>;
}

export class StateHistoryRecorder<Input, State> {

  private readonly history = new TimestampedBuffer<ServerState<Input, State>>(this.recordLengthMs);

  public constructor(serverEntitySyncer: ServerEntitySyncer<Input, State>,
    public readonly recordLengthMs: number) {
    serverEntitySyncer.onSynchronized((entities: Array<Entity<State>>, inputsApplied: Array<EntityTargetedInput<Input>>) => {
      this.history.record({
        entities,
        inputsApplied,
      });
    });
  }

}
