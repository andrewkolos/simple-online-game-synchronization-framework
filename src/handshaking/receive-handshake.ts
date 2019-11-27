import { backOff } from 'exponential-backoff';
import { RecipientMessageBuffer } from '../networking/message-buffer';
import { HandshakeData } from '../networking';

const TIME_MULTIPLE = 1.5;

export async function receiveHandshake(connection: RecipientMessageBuffer<HandshakeData>, timeoutMs?: number): Promise<HandshakeData> {
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
