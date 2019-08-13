import { InputCollectionStrategy } from '../../src/synchronizers/client/input-collection-strategy';
import { EntityBoundInput } from '../../src/synchronizers/client/entity-bound-input';
import { DemoPlayer, MoveInputDirection } from './demo-player';

export class KeyboardDemoInputCollector implements InputCollectionStrategy<DemoPlayer> {
  private playerEntityId: string;
  private leftKeyIsDown: boolean = false;
  private rightKeyIsDown: boolean = false;

  constructor(playerEntityId: string, moveLeftKeyCode: number, moveRightKeyCode: number) {
    this.playerEntityId = playerEntityId;
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.keyCode === moveLeftKeyCode) {
        this.leftKeyIsDown = true;
      }
      if (e.keyCode === moveRightKeyCode) {
        this.rightKeyIsDown = true;
      }
    });
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.keyCode === moveLeftKeyCode) {
        this.leftKeyIsDown = false;
      }
      if (e.keyCode === moveRightKeyCode) {
        this.rightKeyIsDown = false;
      }
    });
  }

  public getInputs(dt: number) {
    const xor = (x: boolean, y: boolean) => (x && !y) || (!x && y);
    const inputs: Array<EntityBoundInput<DemoPlayer>> = [];
    if (xor(this.leftKeyIsDown, this.rightKeyIsDown)) {
      const direction = this.leftKeyIsDown ? MoveInputDirection.Backward : MoveInputDirection.Forward;
      const input: EntityBoundInput<DemoPlayer> = {
        entityId: this.playerEntityId,
        input: {
          direction,
          pressTime: dt,
        },
      };
      inputs.push(input);
    }
    return inputs;
  }
}
