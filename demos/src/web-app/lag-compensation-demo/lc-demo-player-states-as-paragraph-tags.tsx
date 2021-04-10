import React from 'react';
import { LcDemoGameState } from '../../lag-compensation-demo/lc-demo-game-state';

export function lcDemoPlayerStatesAsParagraphTags(game: LcDemoGameState): React.ReactNode {
  return game.players.map(({ id, player }) => <p key={id}>
    {`${id}: YPos: ${player.yOffset.toFixed(2)}, Rotation: ${player.rotationRads.toFixed(2)}, RT: ${(player.timeUntilSpawnMs / 1000).toFixed(2)}`}
  </p>);
}
