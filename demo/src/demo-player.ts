import { InterpolableEntity } from '../../src/entity';
import { LinearInterpolator } from '../../src/interpolate-linearly';

export const enum DemoInputType {
  Move = 'move'
}

export const enum MoveInputDirection {
  Forward = 'right',
  Backward = 'left',
}

interface DemoPlayerState {
  position: number;
}

export interface DemoPlayerInput {
  direction: MoveInputDirection;
  pressTime: number;
}

// Shorten for convenience.
type I = DemoPlayerInput;
type S = DemoPlayerState;

export class DemoPlayer extends InterpolableEntity<I, S> {
  private static MOVE_SPEED = 0.2;
  public kind: 'demoPlayer';
  constructor(id: string, initialState: S) {
    super(id, initialState);
  }
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
  public calculateInterpolatedState(state1: S, state2: S, timeRatio: number): S {
    return LinearInterpolator.from(state1).to(state2).interpolate(timeRatio);
  }
}
