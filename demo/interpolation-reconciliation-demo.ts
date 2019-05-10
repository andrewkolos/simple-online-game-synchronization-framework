import { GameEngine, InputCollector, InputForEntity, GameEntity, ServerGame } from '../src/main';

class DemoEngine extends GameEngine {

  public applyInput(entityId: string, input: Object): void {
    throw new Error('Method not implemented.');
  }
  
  protected step(): void {
    throw new Error('Method not implemented.');
  }
}



interface MoveInput extends InputForEntity {
  inputType: DemoInputType.Move,
  payload: {
    distance: number;
  }
}

export const enum DemoInputType {
  Move = 'move'
}

type DemoInput = MoveInput; // Union with new Input types added in the future.

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
      inputType: DemoInputType.Move,
      entityId: this.playerEntityId,
      payload: {
        distance
      }
    }

    return [input];
  }
}

export class DemoPlayer extends GameEntity {
  
  public position: number;

  constructor(id: string) {
    super(id);
    this.position = 0;
  }
  
  public syncTo(state: this): void {
    this.position = state.position;
  }
  public interpolate(state1: this, state2: this, timeRatio: number): void {
    this.position = state1.position * (1 - timeRatio) + state2.position * timeRatio;
  }
}

export class DemoGameEngine extends GameEngine {
  
  private playerOne: DemoPlayer;
  private playerTwo: DemoPlayer;

  public applyInput(entityId: string, input: DemoInput): void {
    const entity = this.getEntityById(entityId);

    if (entity instanceof DemoPlayer) {
      switch (input.inputType) {
        case DemoInputType.Move:
          entity.position += input.payload.distance;
          break;
      }
    }

  }
  
  protected step(): void {
    if (this.playerOne == null) {
      
    }
  } 
}

export class DemoServer extends ServerGame {

  protected handlePlayerConnection(): void {
    
  }
  
  protected validateInput(input: import("../src/network").InputMessage): boolean {
    throw new Error('Method not implemented.');
  }

  protected getStatesToBroadcastToClients(): import("../src/network").Message[] {
    throw new Error('Method not implemented.');
  }

  
}