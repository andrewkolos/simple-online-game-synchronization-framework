import { InputForEntity } from "./input-for-entity";
import { AnySyncableEntity } from './syncable-entity';

/**
 * Collects inputs for a game step.
 */
export interface InputCollectionStrategy<Entity extends AnySyncableEntity> {
  /**
   * @returns A collection of inputs paired with the entities they are meant
   * to be applied against.
   * @param dt The amount of time that has elapsed since input was last collected.
   */
  getInputs(dt: number): InputForEntity<Entity>[];
}
