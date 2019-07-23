// tslint:disable

import { GameLoop } from '../../src/game-loop';
import { InputCollectionStrategy } from '../../src/synchronizers/client/input-collection-strategy';
import { InMemoryClientServerNetwork, StateMessage, InputMessage } from '../../src/networking';
import { Entity, SyncStrategy, InterpolableEntity } from '../../src/entity';
import { EntityBoundInput } from '../../src/synchronizers/client/entity-bound-input';
import { ClientEntitySynchronizer } from '../../src/synchronizers/client/client-entity-synchronizer';
import { ServerEntitySynchronizer } from '../../src/synchronizers/server/server-entity-synchronizer';
import { NewEntityHandler, NonLocalEntityResponse } from '../../src/synchronizers/client/new-entity-handler';
import { LinearInterpolator } from "../../src/interpolate-linearly";

interface DemoPlayerState {
  position: number;
}

interface DemoPlayerInput {
  direction: MoveInputDirection;
  pressTime: number;
}

export class DemoPlayer extends InterpolableEntity<DemoPlayerInput, DemoPlayerState> {

  private static MOVE_SPEED = 0.2;

  public kind: "demoPlayer";

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

  public calculateInterpolatedState(state1: DemoPlayerState, state2: DemoPlayerState, timeRatio: number): DemoPlayerState {
    return LinearInterpolator.from(state1).to(state2).interpolate(timeRatio);
  }
}

type DemoEntity = DemoPlayer; // Union future entities here.

export const enum DemoInputType {
  Move = 'move'
}

export const enum MoveInputDirection {
  Forward = 'right',
  Backward = 'left'
}

type DemoClientEntitySynchronizer = ClientEntitySynchronizer<DemoEntity>;

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

    const inputs: EntityBoundInput<DemoEntity>[] = [];

    if (xor(this.leftKeyIsDown, this.rightKeyIsDown)) {

      const direction = this.leftKeyIsDown ? MoveInputDirection.Backward : MoveInputDirection.Forward;

      const input: EntityBoundInput<DemoEntity> = {
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

  protected validateInput(entity: Entity<any, any>, input: any) {

    if (entity instanceof Entity && (input as DemoPlayerInput).direction != null) {
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

export class NewDemoEntityHandler implements NewEntityHandler<DemoEntity> {

  public createLocalEntityFromStateMessage(stateMessage: StateMessage<DemoEntity>): DemoPlayer {
    const state = stateMessage.entity.state;
    if (state != null && state.position != null) {
      return new DemoPlayer(stateMessage.entity.id, {
        position: state.position
      });
    }

    throw Error('Unable to convert state message into a game entity.');
  }

  public createNonLocalEntityFromStateMessage(stateMessage: StateMessage<DemoEntity>): NonLocalEntityResponse<DemoEntity> {
    return {
      entity: this.createLocalEntityFromStateMessage(stateMessage),
      syncStrategy: SyncStrategy.Interpolation,
    }
  }

}

// Helper code for running the demo.

function displayGame(entities: DemoEntity[], displayElement: HTMLElement, numberOfPendingInputs: number) {
  const displayElementId = displayElement.id;

  const canvasElement = document.getElementById(`${displayElementId}_canvas`) as HTMLCanvasElement;
  const positionsElement = document.getElementById(`${displayElementId}_positions`) as HTMLElement;
  const lastAckElement = document.getElementById(`${displayElementId}_status`) as HTMLElement;

  renderWorldOntoCanvas(canvasElement, entities);
  writePositions(entities, positionsElement);
  lastAckElement.innerText = `Non-acknowledged inputs: ${numberOfPendingInputs}`;
}

function renderWorldOntoCanvas(canvas: HTMLCanvasElement, entities: DemoEntity[] | ReadonlyArray<DemoEntity>) {

  canvas.width = canvas.width; // Clears the canvas.

  const colors = {
    c0: 'blue',
    c1: 'red'
  };

  entities.forEach((entity: Entity<any, any>) => {
    if (!(entity instanceof DemoPlayer)) return;

    const entityRadius = canvas.height * 0.9 / 2;
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

function writePositions(entities: DemoEntity[] | ReadonlyArray<DemoEntity>, el: HTMLElement) {
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

  const serverConnection = network.getNewConnectionToServer(100);
  const newEntityHandler = new NewDemoEntityHandler();
  const inputCollector = new KeyboardDemoInputCollector(playerEntityId, moveLeftKeycode, moveRightKeyCode);

  const client: DemoClientEntitySynchronizer = new ClientEntitySynchronizer({ serverConnection, newEntityHandler, serverUpdateRateInHz: serverSyncUpdateRate, inputCollector });

  return client;
}

// Start up clients, server, connect them, and start them.

const serverGameUpdateRate = 60;
const serverSyncUpdateRate = 60;
const clientUpdateRate = 60;

const noop = () => { };

const serverGame = new GameLoop(noop);
const client1Game = new GameLoop(noop);
const client2Game = new GameLoop(noop);

const server = new DemoServer();
const network = new InMemoryClientServerNetwork<InputMessage<DemoEntity>, StateMessage<DemoEntity>>();

const client1Id = server.connectClient(network.getNewClientConnection());
const client2Id = server.connectClient(network.getNewClientConnection());

const client1 = createClient(client1Id, 65, 68);
const client2 = createClient(client2Id, 37, 39);

server.on("synchronized", () => {
  const entities = Array.from(server.entities.values());
  const serverCanvas = document.getElementById('server_canvas') as HTMLCanvasElement;
  renderWorldOntoCanvas(serverCanvas, entities);

  const lastProcessedInputForClient1 = server.getLastProcessedInputForClient(client1Id);
  const lastProcessedInputForClient2 = server.getLastProcessedInputForClient(client2Id);

  const serverStatus = document.getElementById('server_status') as HTMLDivElement;
  serverStatus.innerText = `Last acknowledged input: Player 1: #${lastProcessedInputForClient1}` +
    ` Player 2: #${lastProcessedInputForClient2}`;
  writePositions(entities, document.getElementById('server_positions') as HTMLDivElement);
});

client1.on('synchronized', (entityMap: Map<string, DemoEntity>) => {
  displayGame(Array.from(entityMap.values()), document.getElementById('client1') as HTMLElement, client1.numberOfPendingInputs);
});

client2.on('synchronized', (entityMap: Map<string, DemoEntity>) => {
  displayGame(Array.from(entityMap.values()), document.getElementById('client2') as HTMLElement, client2.numberOfPendingInputs);
});


network.on("serverSentMessages", handleMessageSent);
network.on('clientSentMessages', handleMessageSent);

server.start(serverSyncUpdateRate);
client1.start(clientUpdateRate);
client2.start(clientUpdateRate);

client1Game.start(clientUpdateRate);
client2Game.start(clientUpdateRate);
serverGame.start(serverGameUpdateRate);
