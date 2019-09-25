import { Entity } from '.';

export type EntityId = string;

/**
 * Contains entities, allowing retrieval by entity ID.
 */
export class EntityCollection<State> {

  /** These compose the state of the game. */
  private readonly entities: Map<EntityId, State> = new Map();

  /**
   * Creates an instance of an entity collection.
   * @param entities Entities to add to the entity collection to begin with, if any.
   */
  constructor(entities?: Array<Entity<State>>) {
    if (entities != null) {
      entities.forEach((entity: Entity<State>) => {
        this.entities.set(entity.id, entity.state);
      });
    }
  }

  /**
   * Adds/overwrites the entity.
   * @param entity The entity to add.
   */
  public set(entity: Entity<State>) {
    this.entities.set(entity.id, entity.state);
  }

  /**
   * Searches for an entity by ID.
   * @param id The ID of the entity to search for.
   * @returns The entity with the matching ID, if it exists.
   */
  public getState(id: EntityId): State | undefined {
    return this.entities.get(id);
  }

  /**
   * Gets all entities in this collection, as an array.
   * @returns The entities in this collection.
   */
  public asArray(): Array<Entity<State>> {
    return [...this.entities].map(([id, state]) => ({id, state}));
  }

  /**
   * Gets all entities in this collection, as a map keyed by an entity ID.
   * @returns The entities in this collection.
   */
  public asIdKeyedMap(): Map<EntityId, State> {
    return new Map(this.entities);
  }
}
