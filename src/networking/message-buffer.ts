import { StateMessage, InputMessage } from './messages';

/*tslint:disable */

export type Timestamp = number;


/**
 * A network that can be used by a client to communicate to a server or vis-a-versa.
 */
export interface MessageBuffer<ReceiveType, SendType> {
  send(message: SendType): void;
  
  receive(): ReceiveType;

  hasNext(): boolean;
}

export interface ClientEntityMessageBuffer<I, S> extends MessageBuffer<StateMessage<S>, InputMessage<I>> {}
export interface ServerEntityMessageBuffer<I, S> extends MessageBuffer<InputMessage<I>, StateMessage<S>> {}

