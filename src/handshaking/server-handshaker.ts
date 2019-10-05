import { SenderMessageBuffer } from '../networking';
import { ServerHandshakeResponse } from './message-types';

export class ServerHandshaker {

  public constructor(private readonly responseToSendToClients: ServerHandshakeResponse) { }

  public sendHandshakeResponseToClient(client: SenderMessageBuffer<ServerHandshakeResponse>) {
    client.send(this.responseToSendToClients);
  }
}
