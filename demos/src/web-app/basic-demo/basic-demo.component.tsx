import React, { useEffect, useState } from 'react';
import {
  InMemoryClientServerNetwork,
  InputMessage,
  StateMessage,
  ClientEntitySyncerRunner,
  PlayerClientEntitySyncer,
} from '../../../../src';
import {
  BasicDemoPlayerInput,
  BasicDemoPlayerState,
  demoPlayerInputApplicator
} from '../../basic-demo-implementation/player';
import {
  createKeyboardBasicDemoInputCollector,
  KeyboardDemoinputCollectorKeycodes
} from '../../basic-demo-implementation/keyboard-demo-input-collector';
import { BasicDemoClientRenderer } from './basic-demo-client-renderer';
import { ServerRenderer } from './basic-demo-server-renderer';
import { DemoSyncServer } from '../../basic-demo-implementation/demo-server';
import { Disablers } from './disablers';
import { makeStyles } from '@material-ui/core';

const SERVER_SYNC_UPDATE_RATE = 10;
const CLIENT_UPDATE_RATE = 60;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 800,
  },
  intro: {
    marginTop: 5,
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 5,
  }
})

export const BasicDemo: React.FC = () => {

  const [client1, setClient1] = useState<
    ClientEntitySyncerRunner<BasicDemoPlayerInput, BasicDemoPlayerState> | undefined
  >(undefined);
  const [client2, setClient2] = useState<
    ClientEntitySyncerRunner<BasicDemoPlayerInput, BasicDemoPlayerState> | undefined
  >(undefined);
  const [server, setServer] = useState<DemoSyncServer | undefined>(undefined);

  const [c1Disablers, setC1Disablers] = useState<Disablers>({
    prediction: false,
    reconciliation: false,
    interpolation: false
  });
  const [c1Latency, setC1Latency] = useState(150);

  const [c2Disablers, setC2Disablers] = useState<Disablers>({
    prediction: false,
    reconciliation: false,
    interpolation: false
  });
  const [c2Latency, setC2Latency] = useState(250);

  const [serverUpdateRate, setServerUpdateRate] = useState(SERVER_SYNC_UPDATE_RATE);

  useEffect(() => {
    const network = new InMemoryClientServerNetwork<
      InputMessage<BasicDemoPlayerInput>,
      StateMessage<BasicDemoPlayerState>
    >();

    const nserver = new DemoSyncServer();
    nserver.addClient(network.getNewClientConnection());
    nserver.addClient(network.getNewClientConnection());

    const [nclient1, nclient2] = [
      new ClientEntitySyncerRunner(createClient({ moveLeft: 65, moveRight: 68 }, network, serverUpdateRate, c1Disablers, c1Latency)),
      new ClientEntitySyncerRunner(createClient({ moveLeft: 37, moveRight: 39 }, network, serverUpdateRate, c2Disablers, c2Latency))
    ];

    setClient1(nclient1);
    setClient2(nclient2);
    setServer(nserver);

  }, [c1Latency, c1Disablers, c2Latency, c2Disablers, serverUpdateRate]);

  useEffect(() => {
    client1?.start(CLIENT_UPDATE_RATE);
    client2?.start(CLIENT_UPDATE_RATE);
    server?.start(serverUpdateRate);

    return () => {
      client1?.stop();
      client2?.stop();
      server?.stop();
    }
  }, [client1, client2, server]);

  const classes = useStyles();

  return !server || !client1 || !client2 ? (
    <div />
  ) : (
    <div className={classes.root}>
      <p className={classes.intro}>
        This is a demo/test of a framework I created for synchronizing player-controlled objects
        in online games. The below "game" has two players (the blue and red circles).
      </p>
      <p className={classes.intro}>
        This is a recreation of a near-identical demo created by Gabriel Gambetta. If you are 
        interested in taking a guided tour, I recommend checking that out. You can find it&nbsp;
        <a href="https://www.gabrielgambetta.com/client-side-prediction-live-demo.html">on his blog</a>
        &nbsp;which also explains how each of the features works.
      </p>
      <BasicDemoClientRenderer
        key={JSON.stringify(client1) + JSON.stringify(client2) + JSON.stringify(server) + '1'}
        borderColor="blue"
        title={"Player One's view. Move with A and D keys"}
        demoClientRunner={client1}
        onLagValueChanged={lag => setC1Latency(lag)}
        onDisablersChanged={v => setC1Disablers(v)}
        lag={c1Latency}
        disablers={c1Disablers}
      />
      <ServerRenderer 
             key={JSON.stringify(client1) + JSON.stringify(client2) + JSON.stringify(server) + '2'}
             borderColor="gray" demoSyncServer={server} updateRateHz={serverUpdateRate} onUpdateRateChanged={(v) => setServerUpdateRate(v)} />
      <BasicDemoClientRenderer
             key={JSON.stringify(client1) + JSON.stringify(client2) + JSON.stringify(server) + '3'}

        borderColor="red"
        title={"Player Two's view. Move with arrow keys"}
        demoClientRunner={client2}
        onLagValueChanged={lag => setC2Latency(lag)}
        onDisablersChanged={v => setC2Disablers(v)}
          lag={c2Latency}
        disablers={c2Disablers}
      />
    </div>
  );
};

function createClient(
  keyMappings: KeyboardDemoinputCollectorKeycodes,
  network: InMemoryClientServerNetwork<InputMessage<BasicDemoPlayerInput>, StateMessage<BasicDemoPlayerState>>,
  serverUpdateRate: number,
  disablers: Disablers,
  latency: number
) {
  const inputCollector = createKeyboardBasicDemoInputCollector(keyMappings);

  const client = new PlayerClientEntitySyncer({
    connection: network.getNewConnectionToServer(latency),
    localPlayerInputStrategy: {
      inputApplicator: demoPlayerInputApplicator,
      inputSource: inputCollector,
      inputValidator: () => true
    },
    serverUpdateRateHz: serverUpdateRate,
    disableClientSidePrediction: disablers.prediction,
    disableEntityInterpolation: disablers.interpolation,
    disableServerReconciliation: disablers.reconciliation
  });

  return client;
}
