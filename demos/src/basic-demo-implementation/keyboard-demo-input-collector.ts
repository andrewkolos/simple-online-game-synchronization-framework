import { EntityInfo, EntityTargetedInput } from '../../../src';
import { BasicDemoPlayerState, MoveInputDirection, BasicDemoPlayerInput } from './player';
import { Stopwatch } from '../common/keyboard-input/stopwatch';
import { KeyStateTracker } from '../common/keyboard-input/key-state-tracker';

export type KeyboardDemoinputCollectorKeycodes = {
  moveLeft: number;
  moveRight: number;
}

export const createKeyboardBasicDemoInputCollector = (keyMappings: KeyboardDemoinputCollectorKeycodes) => {
  const inputCollectionTimeWatch = new Stopwatch();

  const keyStateTracker = new KeyStateTracker(keyMappings);

  const inputCollector = (entities: Array<EntityInfo<BasicDemoPlayerState>>) => {
    const dt = inputCollectionTimeWatch.reset();
    const keyDownStates = keyStateTracker.getAllKeyDownStates();

    const inputs: Array<EntityTargetedInput<BasicDemoPlayerInput>> = [];
    if (xor(keyDownStates.moveLeft, keyDownStates.moveRight)) {
      const direction = keyDownStates.moveLeft ? MoveInputDirection.Backward : MoveInputDirection.Forward;
      const input: EntityTargetedInput<BasicDemoPlayerInput> = {
        entityId: entities.filter(e => e.local)[0].id,
        input: {
          direction,
          pressTime: dt,
        },
      };
      inputs.push(input);
    }
    return inputs;
  };

  return inputCollector;
};

function xor(x: boolean, y: boolean) {
  return (x && !y) || (!x && y);
}
