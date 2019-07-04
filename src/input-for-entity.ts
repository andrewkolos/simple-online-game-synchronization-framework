import { EntityId } from './client-entity-synchronizer';
export interface InputForEntity<I> {
  /**
   * The entity that is to react to the input.
   */
  entityId: EntityId;
  input: I;
}
