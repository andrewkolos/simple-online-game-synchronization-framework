import { AnyEntity } from 'src/entity';
import { InputMessage, StateMessage } from './messages';

export interface NonIterableMessageBuffer<ReceiveType, SendType> {
  send(message: SendType): void;

  receive(): ReceiveType;

  hasNext(): boolean;
}

/**
 * A network that can be used by a client to communicate to a server or vis-a-versa.
 */
export interface MessageBuffer<ReceiveType, SendType> extends NonIterableMessageBuffer<ReceiveType, SendType>, IterableIterator<ReceiveType> {

}

export function asIterableIterator<M extends NonIterableMessageBuffer<R, S>, R, S>(buffer: M): MessageBuffer<R, S> {
  return {
    ...buffer,
    next: () => {
      if (buffer.hasNext()) {
        return {
          done: false,
          value: buffer.receive()
        };
      } else {
        return {
          done: true,
          value: undefined as any
        }
      }
    },
    [Symbol.iterator](): IterableIterator<R> {
      return this;
    }
  }
}


export interface ClientEntityMessageBuffer<E extends AnyEntity> extends MessageBuffer<StateMessage<E>, InputMessage<E>> { }
export interface ServerEntityMessageBuffer<E extends AnyEntity> extends MessageBuffer<InputMessage<E>, StateMessage<E>> { }

