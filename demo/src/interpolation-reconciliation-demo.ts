// tslint:disable

import { InputForEntity, InputCollectionStrategy, EntityFactory, GameClient } from '../../src/game-client';
import { GameEntity } from '../../src/game-entity';
import { GameEngine } from '../../src/game-engine';
import { GameServer, EntityStateBroadcastMessage } from '../../src/game-server';
import { InMemoryClientServerNetwork } from "../../src/networking/in-memory-client-server-network";

interface MoveInput extends InputForEntity {
  inputType: DemoInputType.Move,
  input: {
    direction: MoveInputDirection;
    pressTime: number;
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

class KeyboardDemoInputCollector implements InputCollectionStrategy {

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

  public getInputs(dt: number): DemoInput[] {

    const xor = (x: boolean, y: boolean) => (x && !y) || (!x && y);

    const inputs: DemoInput[] = [];

    if (xor(this.leftKeyIsDown, this.rightKeyIsDown)) {

      const direction = this.leftKeyIsDown ? MoveInputDirection.Backward : MoveInputDirection.Forward;

      const input: MoveInput = {
        inputType: DemoInputType.Move,
        entityId: this.playerEntityId,
        input: {
          direction,
          pressTime: dt
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
  direction: MoveInputDirection;
  pressTime: number;
}

export class DemoPlayer extends GameEntity<DemoPlayerInput, DemoPlayerState> {

  constructor(id: string, initialState: DemoPlayerState) {
    super(id, initialState);
  }

  public calcNextStateFromInput(currentState: DemoPlayerState, input: DemoPlayerInput): DemoPlayerState {

    const currentPosition = currentState.position;

    let nextPosition;
    
    switch (input.direction) {
      case MoveInputDirection.Forward:
        nextPosition = currentPosition + (input.pressTime * .2);
        break;
      case MoveInputDirection.Backward:
        nextPosition = currentPosition - (input.pressTime * .2);
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
      position: state1.position + (state1.position - state2.position) * timeRatio
    };
  }
}

export class DemoGameEngine extends GameEngine {

  protected step(): void {

    // No game logic.

    return;
  }
}

interface PlayerMovementInfo {
  entityId: string;
  lastInputTimestamp: number,
  pressTimeDuringLastInput: number,
  totalPressTimeInLast10Ms: number;
}

export class DemoServer extends GameServer<DemoGameEngine> {

  private players: DemoPlayer[] = [];
  private playerMovementInfos: PlayerMovementInfo[] = [];

  protected handleClientConnection(clientId: string): void {
    const newPlayer = new DemoPlayer(clientId, { position: 0 });
    this.players.push(newPlayer);
    this.addPlayerEntity(newPlayer, clientId);

    this.playerMovementInfos.push({
      entityId: newPlayer.id,
      lastInputTimestamp: new Date().getTime(),
      pressTimeDuringLastInput: 0,
      totalPressTimeInLast10Ms: 0
    });
  }

  // Message should be a mapped thingy with all available state types.
  // tslint:disable-next-line:no-any
  protected getStatesToBroadcastToClients(): EntityStateBroadcastMessage[] {
    const messages = [];

    for (const p of this.players) {
      messages.push({
        entityId: p.id,
        state: p.state
      })
    }

    return messages;
  }

  protected validateInput(entity: GameEntity<any, any>, input: any) {

    if (entity instanceof GameEntity && (input as DemoPlayerInput).direction != null) {
      const demoPlayerInput = input as DemoPlayerInput;

      const player = this.playerMovementInfos.find((info: PlayerMovementInfo) => {
        return info.entityId === entity.id;
      })
      if (player != null && demoPlayerInput.pressTime != null) {
        return player.lastInputTimestamp + demoPlayerInput.pressTime <= new Date().getTime();
      }
    }

    return false;
  }
}

export class DemoEntityFactory implements EntityFactory {

  public fromStateMessage(entityId: string, state: any): DemoPlayer {
    if (state != null && state.position != null) {
      return new DemoPlayer(entityId, {
        position: state.position
      });
    }

    throw Error('Unable to convert state message into a game entity.');
  }

}

const serverGameUpdateRate = 120;
const serverSyncUpdateRate = 30;
const clientUpdateRate = 120;

const serverGame = new DemoGameEngine();

const server = new DemoServer(serverGame);
server.startServer(serverSyncUpdateRate, serverGameUpdateRate);
const network = new InMemoryClientServerNetwork();

const client1Id = server.connect(network.getNewClientConnection());
const client2Id = server.connect(network.getNewClientConnection());

const createClient = (gameEngine: DemoGameEngine, playerEntityId: string, 
  moveLeftKeycode: number, moveRightKeyCode: number) => {

  const serverConnection = network.getNewServerConnection(100);
  const entityFactory = new DemoEntityFactory();
  const InputCollector = new KeyboardDemoInputCollector(playerEntityId, moveLeftKeycode, moveRightKeyCode);

  const client = new GameClient(gameEngine, serverConnection,
    entityFactory, serverSyncUpdateRate, InputCollector);

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

const serverStatus = document.getElementById('server_status') as HTMLDivElement;
const client1Status = document.getElementById('player1_status') as HTMLDivElement;
const client2Status = document.getElementById('player2_status') as HTMLDivElement;

serverGame.eventEmitter.on('postStep', () => {
  renderWorldOntoCanvas(serverCanvas, serverGame.getEntities());
  const lastProcessedInputForClient1 = server.getLastProcessedInputForClient(client1Id);
  const lastProcessedInputForClient2 = server.getLastProcessedInputForClient(client2Id);

  serverStatus.innerText = `Last acknowledged input: Player 1: #${lastProcessedInputForClient1}` +
    ` Player 2: #${lastProcessedInputForClient2}`;
  writePositions(serverGame.getEntities(), document.getElementById('server_positions') as HTMLDivElement);
});

client1Game.eventEmitter.on('postStep', () => {
  renderWorldOntoCanvas(client1Canvas, client1Game.getEntities());
  client1Status.innerText = `Non-acknowledged inputs: ${client1.numberOfPendingInputs}`;
  writePositions(client1Game.getEntities(), document.getElementById('player1_positions') as HTMLDivElement);
});

client2Game.eventEmitter.on('postStep', () => {
  renderWorldOntoCanvas(client2Canvas, client2Game.getEntities());
  client2Status.innerText = `Non-acknowledged inputs: ${client2.numberOfPendingInputs}`;
  writePositions(client2Game.getEntities(), document.getElementById('player2_positions') as HTMLDivElement);
});

const renderWorldOntoCanvas = (canvas: HTMLCanvasElement, entities: GameEntity<any, any>[]) => {
  
  canvas.width = canvas.width; // Clears the canvas.

  const colors = {
    c0: 'blue',
    c1: 'red'
  };

  entities.forEach((entity: GameEntity<any,any>) => {
    if (!(entity instanceof DemoPlayer)) return;

    const entityRadius = canvas.height*0.9/2;
    const entityPosition = entity.state.position;

    const ctx = canvas.getContext('2d');

    if (ctx == null) throw Error('Canvas context is undefined');

    ctx.beginPath();
    ctx.arc(entityPosition, canvas.height / 2, entityRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = (colors as any)[entity.id];
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'dark' + (colors as any)[entity.id];
    ctx.stroke();
  });
}

const writePositions = (entities: GameEntity<any, any>[], el: HTMLElement) => {
  const message = entities.map(entity => {
    if (!(entity instanceof DemoPlayer)) return;

    return `${entity.id}: ${entity.state.position.toFixed(3)}`;
  }).join(' ');

  el.innerText = message;
}

const handleMessageSent = () => {
  const misc = document.getElementById('misc') as HTMLDivElement;
  
  let message = 'Input Message Queues <br />';

  message += network.inputMessageQueues.map(value => {
    return value.length;
  }).join('<br />');

  message += '<br />State Message Queues <br />';

  message += network.stateMessageQueues.map(value => {
    return value.length;
  }).join('<br />');

  misc.innerHTML = message;
}

network.on('stateMessageSent', handleMessageSent);
network.on('stateMessageSent', handleMessageSent);

