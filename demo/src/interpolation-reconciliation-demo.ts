// tslint:disable

import { GameEngine, GameEntity, InputCollector, InputForEntity, ServerGame, EntityFactory, ClientGame } from '../../src/main';
import { InMemoryClientServerNetwork } from '../../src/network';

interface MoveInput extends InputForEntity {
  inputType: DemoInputType.Move,
  input: {
    direction: MoveInputDirection;
  }
}

export const enum DemoInputType {
  Move = 'move'
}

export const enum MoveInputDirection {
  Forward = 'right',
  Backward = 'left'
}

type DemoInput = MoveInput; // Union with new Input types added in the future.

class KeyboardDemoInputCollector implements InputCollector {

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

  public getInputs(): DemoInput[] {

    const xor = (x: boolean, y: boolean) => (x && !y) || (!x && y);

    const inputs: DemoInput[] = [];

    if (xor(this.leftKeyIsDown, this.rightKeyIsDown)) {

      const direction = this.leftKeyIsDown ? MoveInputDirection.Backward : MoveInputDirection.Forward;

      const input: MoveInput = {
        inputType: DemoInputType.Move,
        entityId: this.playerEntityId,
        input: {
          direction
        }
      }

      inputs.push(input);
    }

    return inputs;
  }
}

interface DemoPlayerState {
  position: number;
}

interface DemoPlayerInput {
  direction?: MoveInputDirection;
}

export class DemoPlayer extends GameEntity<DemoPlayerInput, DemoPlayerState> {

  constructor(id: string, initialState: DemoPlayerState) {
    super(id, initialState);
  }

  public validateInput(_currentState: DemoPlayerState, _input: DemoPlayerInput): boolean {
    // No vulnerabilities here, since any input is valid.
    return true;
  }

  public calcNextStateFromInput(currentState: DemoPlayerState, input: DemoPlayerInput): DemoPlayerState {

    const currentPosition = currentState.position;
    let nextPosition;

    switch (input.direction) {
      case MoveInputDirection.Forward:
        nextPosition = currentPosition + 1;
        break;
      case MoveInputDirection.Backward:
        nextPosition = currentPosition - 1;
        break;
      default:
        nextPosition = currentPosition;
    }

    return {
      position: nextPosition
    };
  }

  public interpolate(state1: DemoPlayerState, state2: DemoPlayerState, timeRatio: number): DemoPlayerState {
    return {
      position: (state1.position * (1.0 - timeRatio)) + (state2.position * timeRatio)
    };
  }
}

export class DemoGameEngine extends GameEngine {

  private tickCounter: number = 0;

  protected step(): void {

    this.tickCounter += 1;

    if (this.tickCounter % 100 === 0) {
      // tslint:disable-next-line:no-console
      console.log('tick', this.tickCounter);
    }

    return;
  }
}

export class DemoServer extends ServerGame<DemoGameEngine> {

  private players: DemoPlayer[];

  protected handlePlayerConnection(clientId: string): void {
    const newPlayer = new DemoPlayer(clientId, { position: 0 });
    this.players.push(newPlayer);
    this.game.addObject(newPlayer);

    this.startServer(90);
  }

  // Message should be a mapped thingy with all available state types.
  // tslint:disable-next-line:no-any
  protected getStatesToBroadcastToClients(): { entityId: string; state: any }[] {
    const messages = [];

    for (const p of this.players) {
      messages.push({
        entityId: p.id,
        state: p.state
      })
    }

    return messages;
  }
}

export class DemoEntityFactory implements EntityFactory {

  fromStateMessage(entityId: string, state: any): DemoPlayer {
    if (state != null && state.position != null) {
      return new DemoPlayer(entityId, {
        position: state.position
      });
    }

    throw Error('Unable to convert state message into a game entity.');
  }

}


const serverUpdateRate = 60;
const clientUpdateRate = 120;

const serverGame = new DemoGameEngine();
const server = new DemoServer(serverGame);
server.startServer(serverUpdateRate);
const network = new InMemoryClientServerNetwork();

const clientConnection = network.getClientConnection();
const client1Id = server.connect(clientConnection);
const client2Id = server.connect(clientConnection);

const createClient = (gameEngine: DemoGameEngine, playerEntityId: string, moveLeftKeycode: number, moveRightKeyCode: number) => {

  const serverConnection = network.getServerConnection();
  const entityFactory = new DemoEntityFactory();
  const InputCollector = new KeyboardDemoInputCollector(playerEntityId, moveLeftKeycode, moveRightKeyCode);

  const client = new ClientGame(gameEngine, serverConnection,
    entityFactory, serverUpdateRate, InputCollector);

  return client;
}

const client1Game = new DemoGameEngine();
const client2Game = new DemoGameEngine();
const client1 = createClient(client1Game, client1Id, 65, 68);
const client2 = createClient(client2Game, client2Id, 37, 39);

client1.startGame(clientUpdateRate);
client2.startGame(clientUpdateRate);

const serverCanvas = document.getElementById('server_canvas') as HTMLCanvasElement;
const client1Canvas = document.getElementById('player1_canvas') as HTMLCanvasElement;
const client2Canvas = document.getElementById('player2_canvas') as HTMLCanvasElement;


serverGame.on('postStep', () => {
  renderWorldOntoCanvas(serverCanvas, serverGame.getEntities());
});

client1Game.on('postStep', () => {
  renderWorldOntoCanvas(client1Canvas, client1Game.getEntities());
});

client2Game.on('postStep', () => {
  renderWorldOntoCanvas(client2Canvas, client2Game.getEntities());
});

const renderWorldOntoCanvas = (canvas: HTMLCanvasElement, entities: GameEntity<any, any>[]) => {
  canvas.width = canvas.width; // Clears the canvas.

  const colors = ['blue', 'red'];

  entities.forEach((entity: GameEntity<any,any>) => {
    if (!(entity instanceof DemoPlayer)) return;

    const entityRadius = canvas.height*0.9/2;
    const entityPosition = entity.state.position;
    const entityIndex = Number(entity.id);

    const ctx = canvas.getContext('2d');

    if (ctx == null) throw Error('Canvas context is undefined');

    ctx.beginPath();
    ctx.arc(entityPosition, canvas.height / 2, entityRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = colors[entityIndex];
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'dark' + colors[entityIndex];
    ctx.stroke();
  });
}

console.log('hi');