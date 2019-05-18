/*tslint:disable */

export type Timestamp = number;

export interface InputMessage {
  entityId: string;
  input: any;
  inputSequenceNumber: number;
}

export interface StateMessage {
  entityId: string;
  state: any;
  lastProcessedInputSequenceNumber: number;
  entityBelongsToRecipientClient?: boolean;
}

/**
 * A network that can be used by a client to communicate to a server or vis-a-versa.
 */
export interface Connection<SendType,ReceiveType> {
  send(message: SendType): void;
  
  receive(): ReceiveType;

  hasNext(): boolean;

  peek(position: number): ReceiveType | undefined;
}

export interface ServerConnection extends Connection<InputMessage, StateMessage> {}
export interface ClientConnection extends Connection<StateMessage, InputMessage> {}

