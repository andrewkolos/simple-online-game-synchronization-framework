import { backOff } from 'exponential-backoff';
import { RecipientMessageBuffer } from '../networking/message-buffer';
import { HandshakeInfo } from '../networking';

const TIME_MULTIPLE = 1.5;

export async function receiveHandshake(connection: RecipientMessageBuffer<HandshakeInfo>, timeoutMs?: number): Promise<HandshakeInfo> {
  const timeout = timeoutMs || 100;
  const timeMultiple = TIME_MULTIPLE;

  return backOff(async () => {
    const handhshakeResp = connection.receive();

    if (handhshakeResp.length === 0) {
      throw Error('Server has not sent a handshake packet.');
    } else {
      return handhshakeResp[0];
    }
  }, {
    startingDelay: 1,
    timeMultiple,
    numOfAttempts: Math.ceil(Math.log(timeout) / Math.log(timeMultiple)),
  });
}
