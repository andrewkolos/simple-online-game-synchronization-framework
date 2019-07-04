import { EntityId } from './client-entity-synchronizer';
export interface InputForEntity<T> {
  /**
   * The entity that is to react to the input.
   */
  entityId: EntityId;
  input: T;
}
