import { AnyEntity, PickInput } from './entity';
import { EntityId } from './synchronizers/client-entity-synchronizer';

export interface EntityBoundInput<E extends AnyEntity> {
  /**
   * The entity that is to react to the input.
   */
  entityId: EntityId;
  input: PickInput<E>;
}
