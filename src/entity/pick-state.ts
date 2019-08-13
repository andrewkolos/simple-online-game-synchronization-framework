import { AnyEntity, Entity } from 'src/entity/entity';
import { PlayerEntity } from './player-entity';

/**
 * Picks an `Entity`'s state type.
 */
export type PickState<E extends AnyEntity> = E extends Entity<infer S> ? S :
  E extends PlayerEntity<any, infer PS> ? PS : never;
