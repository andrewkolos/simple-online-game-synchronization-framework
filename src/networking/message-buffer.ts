import { AnyPlayerEntity, PickState, PickInput } from '../entity';
import { InputMessage, StateMessage } from './messages';

export interface MessageBufferBase<ReceiveType, SendType> {
  send(messages: SendType | SendType[]): void;
  receive(): ReceiveType[];
}

/**
 * A network that can be used by a client to communicate to a server or vis-a-versa.
 */
export interface MessageBuffer<ReceiveType, SendType>
  extends MessageBufferBase<ReceiveType, SendType>, Iterable<ReceiveType> {}

export function asIterable<M extends MessageBufferBase<R, S>, R, S>(buffer: M): MessageBuffer<R, S> {
  return {
    ...buffer,
    [Symbol.iterator](): Iterator<R> {
      return buffer.receive().values();
    },
  };
}

export interface ClientEntityMessageBuffer<E extends AnyPlayerEntity>
  extends MessageBuffer<StateMessage<PickState<E>>, InputMessage<PickInput<E>>> { }
export interface ServerEntityMessageBuffer<E extends AnyPlayerEntity>
  extends MessageBuffer<InputMessage<PickInput<E>>, StateMessage<PickState<E>>> { }
