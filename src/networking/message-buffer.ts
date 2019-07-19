import { AnyEntity } from 'src/entity';
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

export interface ClientEntityMessageBuffer<E extends AnyEntity> extends MessageBuffer<StateMessage<E>, InputMessage<E>> {}
export interface ServerEntityMessageBuffer<E extends AnyEntity> extends MessageBuffer<InputMessage<E>, StateMessage<E>> {}

