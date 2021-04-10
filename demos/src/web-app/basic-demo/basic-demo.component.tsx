import React from 'react';
import { InMemoryClientServerNetwork, InputMessage, StateMessage, ClientEntitySyncerRunner, PlayerClientEntitySyncer } from '../../../../src';
import { BasicDemoPlayerInput, BasicDemoPlayerState, demoPlayerInputApplicator } from '../../basic-demo-implementation/player';
import { createKeyboardBasicDemoInputCollector, KeyboardDemoinputCollectorKeycodes } from '../../basic-demo-implementation/keyboard-demo-input-collector';
import { BasicDemoClientRenderer } from './basic-demo-client-renderer';
import { ServerRenderer } from './basic-demo-server-renderer';
import { DemoSyncServer } from '../../basic-demo-implementation/demo-server';

const SERVER_SYNC_UPDATE_RATE = 60;
const CLIENT_UPDATE_RATE = 60;
const CLIENT_LATENCY_MS = 150;

export class BasicDemo extends React.Component {

  private readonly server: DemoSyncServer;
  private readonly clients: Array<ClientEntitySyncerRunner<BasicDemoPlayerInput, BasicDemoPlayerState>>;

  public constructor(props: {}) {
    super(props);

    const demoServer = new DemoSyncServer();
    const network = new InMemoryClientServerNetwork<InputMessage<BasicDemoPlayerInput>, StateMessage<BasicDemoPlayerState>>();

    demoServer.addClient(network.getNewClientConnection());
    demoServer.addClient(network.getNewClientConnection());

    const client1Runner = new ClientEntitySyncerRunner(createClient({ moveLeft: 65, moveRight: 68 }, network));
    const client2Runner = new ClientEntitySyncerRunner(createClient({ moveLeft: 37, moveRight: 39 }, network));

    demoServer.start(SERVER_SYNC_UPDATE_RATE);
    client1Runner.start(CLIENT_UPDATE_RATE);
    client2Runner.start(CLIENT_UPDATE_RATE);

    this.server = demoServer;
    this.clients = [client1Runner, client2Runner];
  }

  public componentWillUnmount() {
    this.server.stop();
    this.clients.forEach((c) => c.stop());
  }

  public render() {

    return (
      <div>
        <BasicDemoClientRenderer borderColor='blue' title={<p>Player One's view. Move with A and D keys</p>}
          demoClientRunner={this.clients[0]} />
        <ServerRenderer borderColor='gray' demoSyncServer={this.server} />
        <BasicDemoClientRenderer borderColor='red' title={<p>Player Two's view. Move with arrow keys</p>}
          demoClientRunner={this.clients[1]} />
      </div>
    );
  }
}

function createClient(keyMappings: KeyboardDemoinputCollectorKeycodes,
  network: InMemoryClientServerNetwork<InputMessage<BasicDemoPlayerInput>, StateMessage<BasicDemoPlayerState>>) {

  const inputCollector = createKeyboardBasicDemoInputCollector(keyMappings);

  const client = new PlayerClientEntitySyncer({
    connection: network.getNewConnectionToServer(CLIENT_LATENCY_MS),
    localPlayerInputStrategy: {
      inputApplicator: demoPlayerInputApplicator,
      inputSource: inputCollector,
      inputValidator: () => true,
    },
    serverUpdateRateHz: SERVER_SYNC_UPDATE_RATE,
  });

  return client;
}
