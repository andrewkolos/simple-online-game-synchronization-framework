export const enum LcDemoInputType {
  Move = 'move',
}

export const enum LcMoveInputDirection {
  Up = 'up',
  Down = 'down',
  None = 'none',
}

export const enum LcRotateInputDirection {
  Clockwise = 'clockwise',
  Counterclockwise = 'counterclockwise',
  None = 'none',
}

export interface LcDemoPlayerInput {
  pressTime: number;
  direction: LcMoveInputDirection;
  rotation: LcRotateInputDirection;
}

export type LcDemoPlayerState = {
  yOffset: number;
  rotationRads: number;
  timeUntilSpawnMs: number;
};
