import { GameEntity } from './game-entity';

type EntityId = string;

/**
 * Contains all state and game logic for a game.
 */
export class EntityCollection {
  /** These compose the state of the game. */
  private entities: Map<EntityId, GameEntity<any, any>> = new Map();

  /**
   * Adds an entity to the game world.
   * @param entity The entity to add the the world.
   */
  public addEntity(entity: GameEntity<any, any>) {
    this.entities.set(entity.id, entity);
  }

  /**
   * Searches for an entity by ID.
   * @param id The ID of the entity to search for.
   * @returns The entity with the matching ID, if it exists.
   */
  public getEntityById(id: EntityId): GameEntity<any, any> | undefined {
    return this.entities.get(id);
  }

  /**
   * Gets all entities in the game.
   * @returns The entities in the game world.
   */
  public getEntities(): GameEntity<any, any>[] {
    return Array.from(this.entities.values());
  }
}
