import { MessageTypeMap, MessageCategorizer, PickMessageType } from './message-categorizer';

/**
 * A network that can be used by a client to communicate to a server or vis-a-versa.
 */
export interface TwoWayMessageBuffer<R, S> extends RecipientMessageBuffer<R>, SenderMessageBuffer<S> { }

export namespace TwoWayMessageBuffer {
  export function makeFromReceiveSendBuffers<R, S>(recipBuffer: RecipientMessageBuffer<R>,
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
}

export interface RecipientMessageBuffer<T> {
  [Symbol.iterator](): IterableIterator<T>;
  receive(): T[];
}

export interface SenderMessageBuffer<T> {
  send(messages: T | T[]): void;
}

export namespace SenderMessageBuffer {
  export function isTwoWayBuffer<R, S>(buffer: SenderMessageBuffer<S>): buffer is TwoWayMessageBuffer<R, S> {
    return (buffer as Partial<TwoWayMessageBuffer<R, S>>).receive != null;
  }
}

type Split<TypeMap extends MessageTypeMap<unknown>> = { [K in keyof TypeMap]: RecipientMessageBuffer<TypeMap[K]> };

export namespace RecipientMessageBuffer {
  export function isTwoWayBuffer<R, S>(buffer: RecipientMessageBuffer<R>): buffer is TwoWayMessageBuffer<R, S> {
    return (buffer as Partial<TwoWayMessageBuffer<R, S>>).send != null;
  }

  export function split<T extends MessageTypeMap<M>, M>(buffer: RecipientMessageBuffer<PickMessageType<T>>,
    categorizer: MessageCategorizer<T>): Split<T> {

    // tslint:disable-next-line: no-unbound-method
    const receive = buffer.receive;

    buffer.receive = () => {
      throw Error(RecipientMessageBuffer.ATTEMPTED_TO_RECEIVE_ON_SPLIT_ERROR_MESSAGE);
    };

    const record: { [P in keyof T]: Array<T[P]> } = Object.keys(categorizer.availableCategories)
      .reduce((acc: { [P in keyof T]: Array<T[P]> }, current: keyof T) => {
        acc[current] = [];
        return acc;
      }, {} as { [P in keyof T]: Array<T[P]> });

    const splitBuffers: Split<T> = Object.keys(categorizer.availableCategories).reduce((acc: Split<T>, current: keyof T) => {
      const currentReceive = () => {
        const messages = receive();
        messages.forEach((message: PickMessageType<T>) => {
          record[categorizer.assigner(message)].push(message);
        });
        const currentMessages = record[current];
        record[current] = [];
        return currentMessages;
      };

      acc[current] = {
        receive: currentReceive,
        [Symbol.iterator]() {
          return this.receive().values();
        },
      };

      return acc;
    }, {} as Split<T>);

    return splitBuffers;
  }

  /** @internal */
  export const ATTEMPTED_TO_RECEIVE_ON_SPLIT_ERROR_MESSAGE = 'Attempted to receive from a message buffer that has been split. Use the buffers created by the split instead.';
}
