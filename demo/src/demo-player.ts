import { PlayerEntity } from '../../src/entity/player-entity';

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

// Shorten for convenience.
type I = DemoPlayerInput;
type S = DemoPlayerState;

export class DemoPlayer extends PlayerEntity<DemoPlayerInput, DemoPlayerState> {
  private static MOVE_SPEED = 0.2;

  public calcNextStateFromInput(currentState: S, input: I): S {
    const currentPosition = currentState.position;
    let nextPosition;
    switch (input.direction) {
      case MoveInputDirection.Forward:
        nextPosition = currentPosition + (input.pressTime * DemoPlayer.MOVE_SPEED);
        break;
      case MoveInputDirection.Backward:
        nextPosition = currentPosition - (input.pressTime * DemoPlayer.MOVE_SPEED);
        break;
      default:
        nextPosition = currentPosition;
    }
    return {
      position: nextPosition,
    };
  }
}
