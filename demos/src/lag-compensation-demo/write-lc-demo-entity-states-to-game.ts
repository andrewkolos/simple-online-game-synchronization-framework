import { Entity, cloneDumbObject } from '../../../src';
import { LcDemoPlayerState } from './player';
import { LcDemoGameState } from './lc-demo-game-state';
import { LcDemoEntityId } from './lc-demo-entity-ids';

export function writeLcDemoEntityStatesToGame(entities: ReadonlyArray<Entity<LcDemoPlayerState>>, gameState: LcDemoGameState) {
  entities.forEach((entity: Entity<LcDemoPlayerState>) => {
    if (entity.id !== LcDemoEntityId.P1 && entity.id !== LcDemoEntityId.P2) {
      throw Error(`Encountered invalid entity ID when synchronizing, ${entity.id}.`);
    }
    const p = cloneDumbObject(entity);
    const player = p.id === LcDemoEntityId.P1 ? gameState.player1 : gameState.player2;
    player.yOffset = p.state.yOffset;
    player.rotationRads = p.state.rotationRads;
    player.timeUntilSpawnMs = p.state.timeUntilSpawnMs;
  });
}
