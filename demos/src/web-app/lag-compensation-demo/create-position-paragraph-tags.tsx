import { Entity } from '@akolos/ts-client-server-game-synchronization';
import React from 'react';
import { LcDemoPlayerState } from '../../lag-compensation-demo/player';

export function createPositionParagraphTags(entities: Array<Entity<LcDemoPlayerState>>): JSX.Element[] {
  return entities.map((entity: Entity<LcDemoPlayerState>) =>
    <p key={entity.id}>
      {`${entity.id}: ${entity.state.yOffset.toFixed(2)}, ${entity.state.rotationRads.toFixed(2)}`}
    </p>);
}
