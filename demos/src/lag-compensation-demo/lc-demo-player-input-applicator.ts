import { LcMoveInputDirection, LcRotateInputDirection, LcDemoPlayerState, LcDemoPlayerInput } from './player';
import { Entity } from '../../../src';

export const MOVE_SPEED = 0.1;
export const TURN_SPEED = Math.PI / 1000 / 8;

export const lcDemoPlayerInputApplicator = (entity: Entity<LcDemoPlayerState>, input: LcDemoPlayerInput): LcDemoPlayerState => {


  const currentPosition = entity.state.yOffset;
  const currentRotation = entity.state.rotationRads;

  const stateAfterInput: LcDemoPlayerState = {
    yOffset: currentPosition,
    rotationRads: currentRotation,
    timeUntilSpawnMs: 0,
  };

  switch (input.direction) {
    case LcMoveInputDirection.Up:
      stateAfterInput.yOffset = currentPosition + (input.pressTime * MOVE_SPEED);
      break;
    case LcMoveInputDirection.Down:
      stateAfterInput.yOffset = currentPosition - (input.pressTime * MOVE_SPEED);
      break;
  }
  switch (input.rotation) {
    case LcRotateInputDirection.Clockwise:
      stateAfterInput.rotationRads = currentRotation + (input.pressTime * TURN_SPEED);
      break;
    case LcRotateInputDirection.Counterclockwise:
      stateAfterInput.rotationRads = currentRotation - (input.pressTime * TURN_SPEED);
      break;
  }
  return stateAfterInput;
};
