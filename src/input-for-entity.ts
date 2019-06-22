import { EntityId } from './client-entity-synchronizer';
export interface InputForEntity {
  /**
   * The entity should react to the input.
   */
  entityId: EntityId;
  input: unknown;
}
