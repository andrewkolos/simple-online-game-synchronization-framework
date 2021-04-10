import { EntityInfo, EntityTargetedInput } from '../../../src';
import { LcDemoPlayerInput, LcMoveInputDirection, LcRotateInputDirection, LcDemoPlayerState } from './player';
import { KeyStateTracker } from '../common/keyboard-input/key-state-tracker';
import { Stopwatch } from '../common/keyboard-input/stopwatch';

export type LcKeyboardDemoInputCollectorKeycodes = {
  moveUp: number;
  moveDown: number;
  rotateClockwise: number;
  rotateCounterclockwise: number;
};

export const createKeyboardLcDemoInputCollector = (keyMappings: LcKeyboardDemoInputCollectorKeycodes) => {
  const inputCollectionTimeWatch = new Stopwatch();

  const keyStateTracker = new KeyStateTracker(keyMappings);

  const inputCollector = (entities: Array<EntityInfo<LcDemoPlayerState>>) => {
    const dt = inputCollectionTimeWatch.reset();
    const keyDownStates = keyStateTracker.getAllKeyDownStates();

    const input: LcDemoPlayerInput = {
      direction: LcMoveInputDirection.None,
      rotation: LcRotateInputDirection.None,
      pressTime: dt,
    };

    if (xor(keyDownStates.moveUp, keyDownStates.moveDown)) {
      input.direction = keyDownStates.moveUp ? LcMoveInputDirection.Up : LcMoveInputDirection.Down;
    }

    if (xor(keyDownStates.rotateClockwise, keyDownStates.rotateCounterclockwise)) {
      input.rotation = keyDownStates.rotateClockwise ? LcRotateInputDirection.Clockwise : LcRotateInputDirection.Counterclockwise;
    }

    if (input.direction !== LcMoveInputDirection.None || input.rotation !== LcRotateInputDirection.None) {
      const targetEntityId = entities.filter((e) => e.local)[0].id;
      const targetedInput: EntityTargetedInput<LcDemoPlayerInput> = {
        entityId: targetEntityId,
        input,
      };
      return [targetedInput];
    } else {
      return [];
    }
  };

  return inputCollector;
};

function xor(x: boolean, y: boolean) {
  return (x && !y) || (!x && y);
}
