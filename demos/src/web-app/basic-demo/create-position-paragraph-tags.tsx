import React from 'react';
import { BasicDemoPlayerState } from '../../basic-demo-implementation/player';
import { Entity } from '../../../../src';

export function createPositionParagraphTags(entities: ReadonlyArray<Entity<BasicDemoPlayerState>>): React.ReactNode {
  return entities.map((entity: Entity<BasicDemoPlayerState>) => <p key={entity.id}>{`${entity.id}: ${entity.state.position.toFixed(3)}`} </p>);
}
