import { GameLoop } from '../../src/game-loop';
import { InMemoryClientServerNetwork, StateMessage, InputMessage } from '../../src/networking';
import { AnyEntity } from '../../src/entity';
import { ClientEntitySynchronizer } from '../../src/synchronizers/client/client-entity-synchronizer';
import { DemoPlayer, DemoPlayerInput, DemoPlayerState } from './demo-player';
import { KeyboardDemoInputCollector } from './keyboard-demo-input-collector';
import { DemoServer } from './demo-server';
import { DemoEntityFactory } from './demo-entity-factory';

// Helper code for running the demo.

function displayGame(entities: DemoPlayer[], displayElement: HTMLElement, numberOfPendingInputs: number) {
  const displayElementId = displayElement.id;

  const canvasElement = document.getElementById(`${displayElementId}_canvas`) as HTMLCanvasElement;
  const positionsElement = document.getElementById(`${displayElementId}_positions`) as HTMLElement;
  const lastAckElement = document.getElementById(`${displayElementId}_status`) as HTMLElement;

  renderWorldOntoCanvas(canvasElement, entities);
  writePositions(entities, positionsElement);
  lastAckElement.innerText = `Non-acknowledged inputs: ${numberOfPendingInputs}`;
}

function renderWorldOntoCanvas(canvas: HTMLCanvasElement, entities: DemoPlayer[] | ReadonlyArray<DemoPlayer>) {

  canvas.width = canvas.width; // Clears the canvas.

  const colors = {
    c0: 'blue',
    c1: 'red',
  };

  entities.forEach((entity: AnyEntity) => {
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

function writePositions(entities: DemoPlayer[] | ReadonlyArray<DemoPlayer>, el: HTMLElement) {
  const message = entities.map((entity) => {
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
  const newEntityHandler = new DemoEntityFactory(serverSyncUpdateRate);
  const inputCollector = new KeyboardDemoInputCollector(playerEntityId, moveLeftKeycode, moveRightKeyCode);

  const client = new ClientEntitySynchronizer({
    serverConnection,
    newEntityHandler,
    serverUpdateRateInHz: serverSyncUpdateRate,
    inputCollectionStrategy: inputCollector,
  });

  return client;
}

// Start up clients, server, connect them, and start them.

const serverGameUpdateRate = 60;
const serverSyncUpdateRate = 60;
const clientUpdateRate = 60;

// tslint:disable-next-line: no-empty
const noop = () => {};

const serverGame = new GameLoop(noop);
const client1Game = new GameLoop(noop);
const client2Game = new GameLoop(noop);

const server = new DemoServer();
const network = new InMemoryClientServerNetwork<InputMessage<DemoPlayerInput>, StateMessage<DemoPlayerState>>();

const client1Id = server.connectClient(network.getNewClientConnection());
const client2Id = server.connectClient(network.getNewClientConnection());

const client1 = createClient(client1Id, 65, 68);
const client2 = createClient(client2Id, 37, 39);

server.on('synchronized', () => {
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

client1.on('synchronized', (entityMap: Map<string, DemoPlayer>) => {
  displayGame(Array.from(entityMap.values()), document.getElementById('client1') as HTMLElement, client1.numberOfPendingInputs);
});

client2.on('synchronized', (entityMap: Map<string, DemoPlayer>) => {
  displayGame(Array.from(entityMap.values()), document.getElementById('client2') as HTMLElement, client2.numberOfPendingInputs);
});

network.on('serverSentMessages', handleMessageSent);
network.on('clientSentMessages', handleMessageSent);

server.start(serverSyncUpdateRate);
client1.start(clientUpdateRate);
client2.start(clientUpdateRate);

client1Game.start(clientUpdateRate);
client2Game.start(clientUpdateRate);
serverGame.start(serverGameUpdateRate);
