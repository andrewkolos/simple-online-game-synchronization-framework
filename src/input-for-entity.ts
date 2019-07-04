import { EntityId } from './client-entity-synchronizer';
import { AnySyncableEntity, PickInput } from './syncable-entity';

export interface InputForEntity<E extends AnySyncableEntity> {
  /**
   * The entity that is to react to the input.
   */
  entityId: EntityId;
  input: PickInput<E>;
}
