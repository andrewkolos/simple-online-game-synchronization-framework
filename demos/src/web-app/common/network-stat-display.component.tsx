import React from 'react';
import { InMemoryClientServerNetwork } from '@akolos/ts-client-server-game-synchronization';

type NetworkStatDisplayProps = {
  network: InMemoryClientServerNetwork<unknown, unknown>;
};

type NetworkStatDisplayState = {
  pendingClientSentMessageQueueLengths: number[];
  pendingServerSentMessageQueueLengths: number[];
};

export class NetworkStatDisplay extends React.Component<NetworkStatDisplayProps, NetworkStatDisplayState> {
  constructor(props: NetworkStatDisplayProps) {
    super(props);
    props.network.onMessageSent(() => {
      this.setState({
        pendingClientSentMessageQueueLengths: props.network.getClientSentMessageQueueLengths(),
        pendingServerSentMessageQueueLengths: props.network.getServerSentMessageQueueLengths(),
      });
    });
  }

  public render() {
    return (
      <div>
        <p>Client sent message queue lengths:</p>
        {this.props.network.getClientSentMessageQueueLengths().join('<br />')}
        <p>Server sent message queue lengths:</p>
        {this.props.network.getServerSentMessageQueueLengths().join('<br />')}
      </div>
    );
  }
}
