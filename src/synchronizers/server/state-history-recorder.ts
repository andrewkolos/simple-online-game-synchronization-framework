import { Entity } from '../../entity';
import { TimestampedBuffer } from '../../lag-compensation';
import { ServerEntitySyncer } from './server-entity-synchronizer';
import { EntityBoundInput } from '../client';

interface ServerState<Input, State> {
  entities: Array<Entity<State>>;
  inputsApplied: Array<EntityBoundInput<Input>>;
}

export class StateHistoryRecorder<Input, State> {

  private readonly history = new TimestampedBuffer<ServerState<Input, State>>(this.recordLengthMs);

  public constructor(private readonly serverEntitySyncer: ServerEntitySyncer<Input, State>,
    public readonly recordLengthMs: number) {
    serverEntitySyncer.on('synchronized', (entities: Array<Entity<State>>, inputsApplied: Array<EntityBoundInput<Input>>) => {
      this.history.record({
        entities,
        inputsApplied,
      });
    });
  }

}
