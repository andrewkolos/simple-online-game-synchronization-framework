// tslint:disable

import { EntityFactory, ClientEntitySynchronizer } from '../../src/client-entity-synchronizer';
import { SyncableEntity } from '../../src/syncable-entity';
import { ServerEntitySynchronizer, EntityStateBroadcastMessage } from '../../src/server-entity-synchronizer';
import { InMemoryClientServerEntityNetwork } from "../../src/networking/in-memory-client-server-network";
import { GameLoop } from '../../src/game-loop';
import { InputForEntity } from '../../src/input-for-entity';
import { InputCollectionStrategy } from '../../src/input-collection-strategy';

interface DemoPlayerState {
  position: number;
}

interface DemoPlayerInput {
  direction: MoveInputDirection;
  pressTime: number;
}

export class DemoPlayer extends SyncableEntity<DemoPlayerInput, DemoPlayerState> {

  private static MOVE_SPEED = 0.2;

  constructor(id: string, initialState: DemoPlayerState) {
    super(id, initialState);
  }

  public calcNextStateFromInput(currentState: DemoPlayerState, input: DemoPlayerInput): DemoPlayerState {

    const currentPosition = currentState.position;

    let nextPosition;

    switch (input.direction) {
      case MoveInputDirection.Forward:
        nextPosition = currentPosition + (input.pressTime * DemoPlayer.MOVE_SPEED);
        break;
      case MoveInputDirection.Backward:
        nextPosition = currentPosition - (input.pressTime * DemoPlayer.MOVE_SPEED);
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

type DemoEntity = DemoPlayer; // Union future entities here.

interface MoveInput extends InputForEntity<{direction: MoveInputDirection, pressTime: number}> {
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

type DemoClientEntitySynchronizer = ClientEntitySynchronizer<DemoEntity>;

type DemoInput = MoveInput; // Union with new Input types added in the future.

class KeyboardDemoInputCollector implements InputCollectionStrategy<DemoEntity> {

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

interface PlayerMovementInfo {
  entityId: string;
  lastInputTimestamp: number,
  pressTimeDuringLastInput: number,
  totalPressTimeInLast10Ms: number;
}

export class DemoServer extends ServerEntitySynchronizer<DemoEntity> {

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

  protected getIdForNewClient(): string {
    return `c${this.players.length}`;
  }

  protected getStatesToBroadcastToClients(): EntityStateBroadcastMessage<DemoEntity>[] {
    const messages = [];

    for (const p of this.players) {
      messages.push({
        entityId: p.id,
        state: p.state
      })
    }

    return messages;
  }

  protected validateInput(entity: SyncableEntity<any, any>, input: any) {

    if (entity instanceof SyncableEntity && (input as DemoPlayerInput).direction != null) {
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

export class DemoEntityFactory implements EntityFactory<DemoEntity> {

  public fromStateMessage(entityId: string, state: any): DemoPlayer {
    if (state != null && state.position != null) {
      return new DemoPlayer(entityId, {
        position: state.position
      });
    }

    throw Error('Unable to convert state message into a game entity.');
  }

}

// Helper code for running the demo.

function displayGame(client: DemoClientEntitySynchronizer, displayElement: HTMLElement) {
  const entities = client.entities.getEntities();
  const displayElementId = displayElement.id;

  const canvasElement = document.getElementById(`${displayElementId}_canvas`) as HTMLCanvasElement;
  const positionsElement = document.getElementById(`${displayElementId}_positions`) as HTMLElement;
  const lastAckElement = document.getElementById(`${displayElementId}_status`) as HTMLElement;

  renderWorldOntoCanvas(canvasElement, entities);
  writePositions(entities, positionsElement);
  lastAckElement.innerText = `Non-acknowledged inputs: ${client.numberOfPendingInputs}`; 
}

function renderWorldOntoCanvas(canvas: HTMLCanvasElement, entities: DemoEntity[]) {
  
  canvas.width = canvas.width; // Clears the canvas.

  const colors = {
    c0: 'blue',
    c1: 'red'
  };

  entities.forEach((entity: SyncableEntity<any,any>) => {
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

function writePositions(entities: SyncableEntity<any, any>[], el: HTMLElement) {
  const message = entities.map(entity => {
    if (!(entity instanceof DemoPlayer)) return;

    return `${entity.id}: ${entity.state.position.toFixed(3)}`;
  }).join(' ');

  el.innerText = message;
}

function handleMessageSent() {
  const misc = document.getElementById('misc') as HTMLDivElement;
  
  let message = 'Input Message Queues <br />';

  message += network.getInputMessageQueueLengths().join('<br />');

  message += '<br />State Message Queues <br />';

  message += network.getStateMessageQueueLengths().join('<br />');

  misc.innerHTML = message;
}

function createClient(playerEntityId: string, moveLeftKeycode: number, moveRightKeyCode: number) {

  const serverConnection = network.getNewServerConnection(100);
  const entityFactory = new DemoEntityFactory();
  const inputCollector = new KeyboardDemoInputCollector(playerEntityId, moveLeftKeycode, moveRightKeyCode);

  const client: DemoClientEntitySynchronizer = new ClientEntitySynchronizer({serverConnection, entityFactory, serverUpdateRateInHz: serverSyncUpdateRate, inputCollector});

  return client;
}

// Start up clients, server, connect them, and start them.

const serverGameUpdateRate = 120;
const serverSyncUpdateRate = 30;
const clientUpdateRate = 240;

const noop = () => {};

const serverGame = new GameLoop(noop);
const client1Game = new GameLoop(noop);
const client2Game = new GameLoop(noop);

const server = new DemoServer();
const network = new InMemoryClientServerEntityNetwork<DemoPlayer>();

const client1Id = server.connect(network.getNewClientConnection());
const client2Id = server.connect(network.getNewClientConnection());

const client1 = createClient(client1Id, 65, 68);
const client2 = createClient(client2Id, 37, 39);

serverGame.eventEmitter.on('postStep', () => {
  const serverCanvas = document.getElementById('server_canvas') as HTMLCanvasElement;
  renderWorldOntoCanvas(serverCanvas, server.entities.getEntities());

  const lastProcessedInputForClient1 = server.getLastProcessedInputForClient(client1Id);
  const lastProcessedInputForClient2 = server.getLastProcessedInputForClient(client2Id);

  const serverStatus = document.getElementById('server_status') as HTMLDivElement;
  serverStatus.innerText = `Last acknowledged input: Player 1: #${lastProcessedInputForClient1}` +
    ` Player 2: #${lastProcessedInputForClient2}`;
  writePositions(server.entities.getEntities(), document.getElementById('server_positions') as HTMLDivElement);
});

client1Game.eventEmitter.on('postStep', () => {
  displayGame(client1, document.getElementById('client1') as HTMLElement);
});

client2Game.eventEmitter.on('postStep', () => {
  displayGame(client2, document.getElementById('client2') as HTMLElement);
});

network.on('stateMessageSent', handleMessageSent);
network.on('stateMessageSent', handleMessageSent);

server.start(serverSyncUpdateRate);
client1.start(clientUpdateRate);
client2.start(clientUpdateRate);

client1Game.start(clientUpdateRate);
client2Game.start(clientUpdateRate);
serverGame.start(serverGameUpdateRate);
