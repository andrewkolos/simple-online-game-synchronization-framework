import { MessageTypeMap, MessageCategorizer, PickMessageType } from '../message-categorizer';
import { MovingAverage } from '../../util';
import { TwoWayMessageBuffer } from './two-way-message-buffer';

export interface RecipientMessageBuffer<T> {
  [Symbol.iterator](): IterableIterator<T>;
  receive(): T[];
}

type Split<TypeMap extends MessageTypeMap<unknown>> = {
  [K in keyof TypeMap]: RecipientMessageBuffer<TypeMap[K]>;
};

export namespace RecipientMessageBuffer {
  export function isTwoWayBuffer<R, S>(buffer: RecipientMessageBuffer<R>): buffer is TwoWayMessageBuffer<R, S> {
    return (buffer as Partial<TwoWayMessageBuffer<R, S>>).send != null;
  }

  export function fromSource<R>(source: () => R[]): RecipientMessageBuffer<R> {
    return {
      receive: source,
      [Symbol.iterator]() {
        return this.receive().values();
      },
    };
  }

  /**
   * Splits a buffer into multiple buffers. Incoming messages will be routed to one of the created buffers
   * using the argued categorizer. The original buffer will share its message pool with all the new buffers.
   * @param buffer The buffer to split.
   * @param categorizer The categorizer to use to route messages to the newly created buffers.
   */
  export function split<T extends MessageTypeMap<unknown>>(buffer: RecipientMessageBuffer<PickMessageType<T>>,
    categorizer: MessageCategorizer<T>): Split<T> {

    const record: {
      [P in keyof T]: Array<T[P]>;
    } = Object.keys(categorizer.availableCategories)
      .reduce((acc: { [P in keyof T]: Array<T[P]>; }, current: keyof T) => {
        acc[current] = [];
        return acc;
      }, {} as { [P in keyof T]: Array<T[P]> });

    // tslint:disable-next-line: no-unbound-method
    const receive = buffer.receive;
    buffer.receive = () => {
      const allMessages: Array<PickMessageType<T>> = [];
      Object.keys(categorizer.availableCategories).forEach((c: keyof T) => {
        allMessages.push(...record[c]);
      });
      return allMessages;
    };

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

  export function trackLatency<R>(buffer: RecipientMessageBuffer<R>,
    timestampExtractor: (message: R) => number, numSamples = DEFAULT_LATENCY_TRACKING_SAMPLE_COUNT): () => number {

    const runningAverageLatency = new MovingAverage(numSamples);
    RecipientMessageBuffer.addListener(buffer, (messages: R[]) => {
      const now = new Date().getTime();
      messages.forEach((m: R) => {
        const timestamp = timestampExtractor(m);
        runningAverageLatency.add(now - timestamp);
      });
    });

    return () => runningAverageLatency.value;
  }

  export function addListener<R>(buffer: RecipientMessageBuffer<R>, listener: (messages: R[]) => void): void {
    buffer.receive = () => {
      const messages = buffer.receive();
      listener(messages);
      return messages;
    };

    buffer[Symbol.iterator] = () => {
      return buffer.receive().values();
    };
  }

  export function map<R, T>(buffer: RecipientMessageBuffer<R>, fn: (message: R) => T): RecipientMessageBuffer<T> {
    return RecipientMessageBuffer.fromSource(() => buffer.receive().map((m) => fn(m)));
  }

  export function mapAll<R, T>(buffer: RecipientMessageBuffer<R>, fn: (messages: R[]) => T[]): RecipientMessageBuffer<T> {
    return RecipientMessageBuffer.fromSource(() => fn(buffer.receive()));
  }

  export type PickReceiveType<T extends RecipientMessageBuffer<unknown>> = T extends RecipientMessageBuffer<infer R> ? R : unknown;
}

const DEFAULT_LATENCY_TRACKING_SAMPLE_COUNT = 30;
