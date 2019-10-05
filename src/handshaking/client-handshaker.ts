import { TwoWayMessageBuffer } from '../networking';
import { ServerHandshakeResponse, ClientHandshakeRequest } from './message-types';
import { backOff } from 'exponential-backoff';

export class ClientHandshaker {

  public constructor(private readonly connectionToServer: TwoWayMessageBuffer<ServerHandshakeResponse, ClientHandshakeRequest>) { }

  public async handshake(): Promise<ServerHandshakeResponse> {
    const resp = await backOff(() => this.tryHandshake(), {
      startingDelay: 10,
    });

    return resp;
  }

  private async tryHandshake(): Promise<ServerHandshakeResponse> {
    const responses = this.connectionToServer.receive();
    if (responses.length > 0) {
      return responses[0];
    } else {
      throw Error('Server has yet to send a handshake response.');
    }
  }
}
