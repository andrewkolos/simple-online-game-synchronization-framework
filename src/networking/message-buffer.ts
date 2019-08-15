import { AnyPlayerEntity, PickState, PickInput } from '../entity';
import { InputMessage, StateMessage } from './messages';

/**
 * A network that can be used by a client to communicate to a server or vis-a-versa.
 */
export interface TwoWayMessageBuffer<R, S> extends RecipientMessageBuffer<R>, SenderMessageBuffer<S> {
}

export interface ClientEntityMessageBuffer<E extends AnyPlayerEntity>
  extends TwoWayMessageBuffer<StateMessage<PickState<E>>, InputMessage<PickInput<E>>> { }
export interface ServerEntityMessageBuffer<E extends AnyPlayerEntity>
  extends TwoWayMessageBuffer<InputMessage<PickInput<E>>, StateMessage<PickState<E>>> { }

export interface RecipientMessageBuffer<T> {
  [Symbol.iterator](): IterableIterator<T>;
  receive(): T[];
}

export interface SenderMessageBuffer<T> {
  send(messages: T | T[]): void;
}
