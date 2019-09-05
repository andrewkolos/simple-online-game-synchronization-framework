import { GameLoop } from '../../src/game-loop';
import { InMemoryClientServerNetwork, InputMessage, StateMessage } from '../../src/networking';
import { ClientEntitySyncerRunner, PlayerClientEntitySyncer, ServerEntitySyncerRunner } from '../../src/synchronizers';
import { DemoPlayer, DemoPlayerInput, demoPlayerInputApplicator, DemoPlayerState } from './demo-player';
import { createDemoServerSyncer } from './demo-server';
import { createKeyboardDemoInputCollector, KeyboardDemoinputCollectorKeycodes as KeyboardDemoInputCollectorKeycodes } from './keyboard-demo-input-collector';

// Helper code for running the demo. ///

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

  entities.forEach((entity: DemoPlayer) => {
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

function writePositions(entities: DemoPlayer[], el: HTMLElement) {
  const message = entities.map((entity: DemoPlayer) => {
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

function createClient(playerEntityId: string, keyMappings: KeyboardDemoInputCollectorKeycodes, serverUpdateRateHz: number) {

  const connection = network.getNewConnectionToServer(100);
  const inputCollector = createKeyboardDemoInputCollector(playerEntityId, keyMappings);

  const client = new PlayerClientEntitySyncer({
    connection,
    localPlayerSyncStrategy: {
      inputApplicator: demoPlayerInputApplicator,
      inputSource: inputCollector,
    },
    serverUpdateRateHz,
  });

  return client;
}

// Start up clients, server, connect them, and start them. ///

const serverGameUpdateRate = 60;
const serverSyncUpdateRate = 60;
const clientUpdateRate = 60;

// tslint:disable-next-line: no-empty
const noop = () => {};

const serverGame = new GameLoop(noop);
const client1Game = new GameLoop(noop);
const client2Game = new GameLoop(noop);

const serverSyncer = createDemoServerSyncer();
const serverRunner = new ServerEntitySyncerRunner(serverSyncer);
const network = new InMemoryClientServerNetwork<InputMessage<DemoPlayerInput>, StateMessage<DemoPlayerState>>();

const client1Id = serverSyncer.connectClient(network.getNewClientConnection());
const client2Id = serverSyncer.connectClient(network.getNewClientConnection());

const client1Runner = new ClientEntitySyncerRunner(createClient(client1Id, { moveLeft: 65, moveRight: 68}, serverSyncUpdateRate));
const client2Runner = new ClientEntitySyncerRunner(createClient(client2Id, { moveLeft: 37, moveRight: 39}, serverSyncUpdateRate));

serverRunner.onSynchronized((entities: DemoPlayer[]) => {
  const serverCanvas = document.getElementById('server_canvas') as HTMLCanvasElement;
  renderWorldOntoCanvas(serverCanvas, entities);

  const lastProcessedInputForClient1 = serverSyncer.getLastProcessedInputForClient(client1Id);
  const lastProcessedInputForClient2 = serverSyncer.getLastProcessedInputForClient(client2Id);

  const serverStatus = document.getElementById('server_status') as HTMLDivElement;
  serverStatus.innerText = `Last acknowledged input: Player 1: #${lastProcessedInputForClient1}` +
    ` Player 2: #${lastProcessedInputForClient2}`;
  writePositions(entities, document.getElementById('server_positions') as HTMLDivElement);
});

client1Runner.onSynchronized((entities: DemoPlayer[]) => {
  displayGame(entities, document.getElementById('client1') as HTMLElement, client1Runner.synchronizer.getNumberOfPendingInputs());
});

client2Runner.onSynchronized((entities: DemoPlayer[]) => {
  displayGame(entities, document.getElementById('client2') as HTMLElement, client2Runner.synchronizer.getNumberOfPendingInputs());
});

network.onServerSentMessages(handleMessageSent);
network.onClientSentMessages(handleMessageSent);

serverRunner.start(serverSyncUpdateRate);
client1Runner.start(clientUpdateRate);
client2Runner.start(clientUpdateRate);

client1Game.start(clientUpdateRate);
client2Game.start(clientUpdateRate);
serverGame.start(serverGameUpdateRate);
