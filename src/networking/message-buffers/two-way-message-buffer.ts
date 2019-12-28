import { RecipientMessageBuffer } from './recipient-message-buffer';
import { SenderMessageBuffer } from './sender-message-buffer';

/**
 * A network that can be used by a client to communicate to a server or vis-a-versa.
 */
export interface TwoWayMessageBuffer<R, S> extends RecipientMessageBuffer<R>, SenderMessageBuffer<S> {}

export namespace TwoWayMessageBuffer {
  export function fromBuffers<R, S>(recipBuffer: RecipientMessageBuffer<R>,
    senderBuffer: SenderMessageBuffer<S>): TwoWayMessageBuffer<R, S> {

    return {
      receive() {
        return recipBuffer.receive();
      },
      [Symbol.iterator]() {
        return this.receive().values();
      },
      send(messages: S | S[]) {
        senderBuffer.send(messages);
      },
    };
  }

  export function extractBuffers<R, S>(buffer: TwoWayMessageBuffer<R, S>) {
    const sender: SenderMessageBuffer<S> = {
      send(messages: S | S[]) {
        buffer.send(messages);
      },
    };
    const recipient: RecipientMessageBuffer<R> = {
      [Symbol.iterator]() {
        return buffer.receive().values();
      },
      receive() {
        return buffer.receive();
      },
    };
    return {
      sender,
      recipient,
    };
  }

  export function addSendListener<R, S>(buffer: TwoWayMessageBuffer<R, S>, listener: (messages: S[]) => void) {
    SenderMessageBuffer.addListener(buffer, listener);
  }

  export function addReceiveListener<R, S>(buffer: TwoWayMessageBuffer<R, S>, listener: (messages: R[]) => void) {
    RecipientMessageBuffer.addListener(buffer, listener);
  }

}
