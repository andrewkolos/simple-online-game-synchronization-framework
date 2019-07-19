import { EntityId } from './client-entity-synchronizer';
import { AnyEntity, PickInput } from './entity';

export interface EntityBoundInput<E extends AnyEntity> {
  /**
   * The entity that is to react to the input.
   */
  entityId: EntityId;
  input: PickInput<E>;
}
