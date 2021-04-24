import React from 'react';
import { InMemoryClientServerNetwork } from '../../../../src';

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
    props.network.on('clientSentMessages', () => updateState());
    props.network.on('serverSentMessages', () => updateState());
    const updateState = () => {
      this.setState({
        pendingClientSentMessageQueueLengths: props.network.getClientSentMessageQueueLengths(),
        pendingServerSentMessageQueueLengths: props.network.getServerSentMessageQueueLengths()
      });
    };
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
