import { InputMessage, StateMessage } from './messages';

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

export interface ClientEntityMessageBuffer extends MessageBuffer<StateMessage, InputMessage> {}
export interface ServerEntityMessageBuffer extends MessageBuffer<InputMessage, StateMessage> {}
