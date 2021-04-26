import { InMemoryClientServerNetwork, InputMessage, StateMessage } from '../../../../src';
import React from 'react';
import { LcKeyboardDemoInputCollectorKeycodes } from '../../lag-compensation-demo/keyboard-LC-demo-input-collector';
import { LcDemoClient } from '../../lag-compensation-demo/lc-demo-client';
import { basicLcDemoGameConfig } from '../../lag-compensation-demo/lc-demo-game-config';
import { LcDemoGameServer } from '../../lag-compensation-demo/lc-demo-server';
import { LcDemoPlayerInput, LcDemoPlayerState } from '../../lag-compensation-demo/player';
import { LcDemoClientRenderer } from './lc-demo-client-renderer';
import { LcDemoServerRenderer } from './lc-demo-server-renderer';

const SERVER_SYNC_UPDATE_RATE = 3;
const CLIENT_UPDATE_RATE = 60;
const CLIENT_LATENCY_MS = 500;

export class LcDemo extends React.Component {
  private readonly server: LcDemoGameServer;
  private readonly p1Client: LcDemoClient;
  private readonly p2Client: LcDemoClient;

  public constructor(props: {}) {
    super(props);

    const demoServer = new LcDemoGameServer(basicLcDemoGameConfig);
    const network = new InMemoryClientServerNetwork<InputMessage<LcDemoPlayerInput>, StateMessage<LcDemoPlayerState>>();

    demoServer.connectClient(network.getNewClientConnection());
    demoServer.connectClient(network.getNewClientConnection());

    const client1 = createClient(
      {
        moveUp: 87,
        moveDown: 83,
        rotateClockwise: 65,
        rotateCounterclockwise: 68
      },
      network
    );
    const client2 = createClient(
      {
        moveUp: 38,
        moveDown: 40,
        rotateClockwise: 39,
        rotateCounterclockwise: 37
      },
      network
    );

    demoServer.start(SERVER_SYNC_UPDATE_RATE);
    client1.start(CLIENT_UPDATE_RATE);
    client2.start(CLIENT_UPDATE_RATE);

    this.server = demoServer;
    this.p1Client = client1;
    this.p2Client = client2;
  }

  public componentWillUnmount() {
    this.server.stop();
    this.p1Client.stop();
    this.p2Client.stop();
  }

  public render() {
    return (
      <div style={{ maxWidth: 1200 }}>
        <p style={{ marginLeft: 15, maxWidth: 1000 }}>
          This (incomplete) demo can be used to demonstrate problems when players interact with each other with high
          latency. Try hitting the Red triangle with the Blue triangle's laser while simultaneously dodging it on Red's
          client. On Blue's client, it will look like you hit Red, but nothing will happen. This is because no lag
          compensation is implemented. I hope to get around to finishing this someday.
        </p>
        <LcDemoClientRenderer
          borderColor="blue"
          title={<p>Player One's view. Move with WASD.</p>}
          client={this.p1Client}
        />
        <LcDemoServerRenderer borderColor="gray" server={this.server} />
        <LcDemoClientRenderer
          borderColor="red"
          title={<p>Player Two's view. Move with arrow keys.</p>}
          client={this.p2Client}
        />
      </div>
    );
  }
}

function createClient(
  keyMappings: LcKeyboardDemoInputCollectorKeycodes,
  network: InMemoryClientServerNetwork<InputMessage<LcDemoPlayerInput>, StateMessage<LcDemoPlayerState>>
) {
  return new LcDemoClient(basicLcDemoGameConfig, {
    syncRateHz: CLIENT_UPDATE_RATE,
    keyMappings,
    connectionToServer: network.getNewConnectionToServer(CLIENT_LATENCY_MS),
    serverUpdateRateHz: SERVER_SYNC_UPDATE_RATE
  });
}
