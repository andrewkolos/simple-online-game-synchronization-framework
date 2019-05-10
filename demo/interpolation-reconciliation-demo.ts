import { GameEngine, InputCollector, InputForEntity, GameEntity } from '../src/main';

class DemoEngine extends GameEngine {

  public applyInput(entityId: string, input: Object): void {
    throw new Error('Method not implemented.');
  }
  
  protected step(): void {
    throw new Error('Method not implemented.');
  }
}

interface MoveInput extends InputForEntity {
  inputType: 'move',
  payload: {
    distance: number;
  }
}

type DemoInput = MoveInput;

class KeyboardDemoInputCollector implements InputCollector {

  private readonly MOVE_DISTANCE_PER_MS: number = 0.002;

  private playerEntityId: string;

  private leftKeyIsDown: boolean = false;
  private rightKeyIsDown: boolean = false;

  constructor(playerEntityId: string, moveLeftKeyCode: number, moveRightKeyCode: number) {

    this.playerEntityId = playerEntityId;

    window.onkeydown = (e: KeyboardEvent) => {
      if (e.keyCode === moveLeftKeyCode) {
        this.leftKeyIsDown = true;
      }
      if (e.keyCode === moveRightKeyCode) {
        this.rightKeyIsDown = true;
      }
    }

    window.onkeyup = (e: KeyboardEvent) => {
      if (e.keyCode === moveLeftKeyCode) {
        this.leftKeyIsDown = false;
      }
      if (e.keyCode === moveRightKeyCode) {
        this.rightKeyIsDown = false;
      }
    }
  }

  public getInputs(dt: number): DemoInput[] {

    let distance = 0;
    if (this.leftKeyIsDown) {
      distance = -this.MOVE_DISTANCE_PER_MS * dt;
    } else if (this.rightKeyIsDown) {
      distance = this.MOVE_DISTANCE_PER_MS * dt;
    }
    
    const input: MoveInput = {
      entityId: this.playerEntityId,
      inputType: 'move',
      payload: {
        distance
      }
    }

    return [input];
  }
}

export class DemoPlayer extends GameEntity {
  
  public position: number;
  
  public syncTo(state: this): void {
    this.position = state.position;
  }
  public interpolate(state1: this, state2: this, timeRatio: number): void {
    this.position = state1.position * (1 - timeRatio) + state2.position * timeRatio;
  }
}