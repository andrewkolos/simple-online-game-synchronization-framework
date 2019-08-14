import { AnyPlayerEntity } from '../entity';

export type EntityId = string;

/**
 * Contains entities, allowing retrieval by entity ID.
 */
export class EntityCollection<E extends AnyPlayerEntity> {

  /** These compose the state of the game. */
  private readonly entities: Map<EntityId, E> = new Map();

  /**
   * Creates an instance of an entity collection.
   * @param entities Entities to add to the entity collection to begin with, if any.
   */
  constructor(entities?: E[]) {
    if (entities != null) {
      entities.forEach((entity: E) => {
        this.entities.set(entity.id, entity);
      });
    }
  }

  /**
   * Adds an entity to the game world.
   * @param entity The entity to add the the world.
   */
  public add(entity: E) {
    this.entities.set(entity.id, entity);
  }

  /**
   * Searches for an entity by ID.
   * @param id The ID of the entity to search for.
   * @returns The entity with the matching ID, if it exists.
   */
  public get(id: EntityId): E | undefined {
    return this.entities.get(id);
  }

  /**
   * Gets all entities in this collection, as an array.
   * @returns The entities in this collection.
   */
  public asArray(): E[] {
    return Array.from(this.entities.values());
  }

  /**
   * Gets all entities in this collection, as a map keyed by an entity ID.
   * @returns The entities in this collection.
   */
  public asIdKeyedMap(): Map<EntityId, E> {
    return new Map(this.entities);
  }
}
