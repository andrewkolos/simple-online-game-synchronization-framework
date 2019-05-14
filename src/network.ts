/*tslint:disable */

import { Queue } from 'queue-typescript';

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
}

/**
 * A network that can be used by a client to communicate to a server or vis-a-versa.
 */
export interface Connection<SendType,ReceiveType> {
  send(message: SendType): void;
  
  receive(): ReceiveType;

  hasNext(): boolean;
}

export interface ServerConnection extends Connection<InputMessage, StateMessage> {}
export interface ClientConnection extends Connection<StateMessage, InputMessage> {}

export class InMemoryClientServerNetwork {

  private inputMessageQueue = new Queue<InputMessage>();
  private stateMessageQueue = new Queue<StateMessage>();
  
  public getServerConnection(): ServerConnection {
    return {
      send: (message: InputMessage) => {
        this.inputMessageQueue.enqueue(message);
      },
      receive: () => {
        return this.stateMessageQueue.dequeue();
      },
      hasNext: () => {
        return this.stateMessageQueue.length > 0;
      }
    }
  }

  public getClientConnection(): ClientConnection {
    return {
      send: (message: StateMessage) => {
        this.stateMessageQueue.enqueue(message);
      },
      receive: () => {
        return this.inputMessageQueue.dequeue();
      },
      hasNext: () => {
        return this.inputMessageQueue.length > 0;
      }
    }
  }
}