import { EntityBoundInput } from '../../src/synchronizers/client/entity-bound-input';
import { MoveInputDirection, DemoPlayerInput } from './demo-player';

export interface KeyboardDemoinputCollectorKeycodes {
  moveLeft: number;
  moveRight: number;
}

export const createKeyboardDemoInputCollector = (playerEntityId: string, keyMappings: KeyboardDemoinputCollectorKeycodes) => {
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

  const inputCollector = () => {
    const now = new Date().getTime();
    const dt = lastCollectionTime != null ? now - lastCollectionTime : 0;
    lastCollectionTime = now;

    const xor = (x: boolean, y: boolean) => (x && !y) || (!x && y);
    const inputs: Array<EntityBoundInput<DemoPlayerInput>> = [];
    if (xor(leftKeyIsDown, rightKeyIsDown)) {
      const direction = leftKeyIsDown ? MoveInputDirection.Backward : MoveInputDirection.Forward;
      const input: EntityBoundInput<DemoPlayerInput> = {
        entityId: playerEntityId,
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
