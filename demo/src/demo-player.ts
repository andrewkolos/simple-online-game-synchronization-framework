import { Entity } from '../../src/entity';

export const enum DemoInputType {
  Move = 'move',
}

export const enum MoveInputDirection {
  Forward = 'right',
  Backward = 'left',
}

// tslint:disable-next-line: interface-over-type-literal
export type DemoPlayerState = {
  position: number;
};

export interface DemoPlayerInput {
  direction: MoveInputDirection;
  pressTime: number;
}

export const demoPlayerInputApplicator = (currentState: DemoPlayerState, input: DemoPlayerInput): DemoPlayerState => {
  const MOVE_SPEED = 0.2;

  const currentPosition = currentState.position;
  switch (input.direction) {
    case MoveInputDirection.Forward:
      return { position: currentPosition + (input.pressTime * MOVE_SPEED) };
    case MoveInputDirection.Backward:
      return { position: currentPosition - (input.pressTime * MOVE_SPEED) };
    default:
      return { position: currentPosition };
  }
};

export type DemoPlayer = Entity<DemoPlayerState>;
