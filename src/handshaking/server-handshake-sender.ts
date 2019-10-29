import { HandshakeInfo } from '../networking';
import { SenderMessageBuffer } from '../networking/message-buffer';

export function sendHandshakeToClient(handshakeInfo: HandshakeInfo, client: SenderMessageBuffer<HandshakeInfo>) {
  client.send(handshakeInfo);
}
