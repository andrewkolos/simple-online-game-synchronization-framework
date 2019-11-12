import { EntityTargetedInput } from '../../src/synchronizers/client/entity-targeted-input';
import { MoveInputDirection, DemoPlayerInput, DemoPlayerState } from './demo-player';
import { EntityInfo } from '../../src/synchronizers';

export interface KeyboardDemoinputCollectorKeycodes {
  moveLeft: number;
  moveRight: number;
}

export const createKeyboardDemoInputCollector = (keyMappings: KeyboardDemoinputCollectorKeycodes) => {
  let lastCollectionTime: number;

  let leftKeyIsDown = false;
  let rightKeyIsDown = false;

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.keyCode === keyMappings.moveLeft) {
      leftKeyIsDown = true;
    }
    if (e.keyCode === keyMappings.moveRight) {
      rightKeyIsDown = true;
    }
  });
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.keyCode === keyMappings.moveLeft) {
      leftKeyIsDown = false;
    }
    if (e.keyCode === keyMappings.moveRight) {
      rightKeyIsDown = false;
    }
  });

  const inputCollector = (entities: Array<EntityInfo<DemoPlayerState>>) => {
    const now = new Date().getTime();
    const dt = lastCollectionTime != null ? now - lastCollectionTime : 0;
    lastCollectionTime = now;

    const xor = (x: boolean, y: boolean) => (x && !y) || (!x && y);
    const inputs: Array<EntityTargetedInput<DemoPlayerInput>> = [];
    if (xor(leftKeyIsDown, rightKeyIsDown)) {
      const direction = leftKeyIsDown ? MoveInputDirection.Backward : MoveInputDirection.Forward;
      const input: EntityTargetedInput<DemoPlayerInput> = {
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
