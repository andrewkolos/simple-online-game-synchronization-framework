/*tslint:disable */

import { EntityId } from './main';
import { Queue } from 'queue-typescript';

export type Timestamp = number;

/**
 * A game message please 
 */
export interface Message {
  entityId: EntityId;
  payload: Object;
}

export interface InputMessage extends Message {
  inputSequenceNumber: number;
}

export interface StateMessage extends Message {
  lastProcessedInputSequenceNumber: number;
}

interface TimestampedInputMessage {
  inputMessage: InputMessage;
  receivedTimestamp: Timestamp;
}

interface TimestampedStateMessage {
  stateMessage: StateMessage;
  receivedTimestamp: Timestamp;
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

const sendEvent = 'send';

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

class SafeQueue<T> {

  private items: T[] = [];

  constructor(items?: T[]) {
    if (items != null) this.items = items;  
  }

  public enqueue(item: T) {
    this.items.push(item);
  }

  public dequeue(): T | undefined {
    if (this.items.length > 0) {
      const item = this.items[0];
      this.items.splice(0, 1);
      return item;
    }

    return undefined;
  }

  public getItems() {
    return this.items;
  }

  public size() {
    return this.items.length;
  }
}