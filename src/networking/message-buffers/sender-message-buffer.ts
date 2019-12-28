import { arrayify } from '../../util-types';
import { TwoWayMessageBuffer } from './two-way-message-buffer';
export interface SenderMessageBuffer<T> {
  send(messages: T | T[]): void;
}
export namespace SenderMessageBuffer {
  export function isTwoWayBuffer<R, S>(buffer: SenderMessageBuffer<S>): buffer is TwoWayMessageBuffer<R, S> {
    return (buffer as Partial<TwoWayMessageBuffer<R, S>>).receive != null;
  }
  export function addListener<T>(buffer: SenderMessageBuffer<T>, listener: (messages: T[]) => void) {
    buffer.send = (messages: T | T[]) => {
      listener(arrayify(messages));
      buffer.send(messages);
    };
  }
}
