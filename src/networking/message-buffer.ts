import { StateMessage, InputMessage } from './messages';
import { AnySyncableEntity } from '../syncable-entity';

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

export interface ClientEntityMessageBuffer<E extends AnySyncableEntity> extends MessageBuffer<StateMessage<E>, InputMessage<E>> {}
export interface ServerEntityMessageBuffer<E extends AnySyncableEntity> extends MessageBuffer<InputMessage<E>, StateMessage<E>> {}

