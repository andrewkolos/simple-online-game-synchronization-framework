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

  private inputMessageQueue = new Array<InputMessage>();
  private stateMessageQueue = new Array<StateMessage>();
  
  public getServerConnection(): ServerConnection {
    return {
      send: (message: InputMessage) => {
        this.inputMessageQueue.push(message);
      },
      receive: () => {
        return unsafePop(this.stateMessageQueue);
      },
      hasNext: () => {
        return this.stateMessageQueue.length > 0;
      }
    }
  }

  public getClientConnection(): ClientConnection {
    return {
      send: (message: StateMessage) => {
        this.stateMessageQueue.push(message);
      },
      receive: () => {
        return unsafePop(this.inputMessageQueue);
      },
      hasNext: () => {
        return this.inputMessageQueue.length > 0;
      }
    }
  }
}

function unsafePop<T>(array: Array<T>): T {
  const val = array.pop();
  if (val == null) throw Error('Cannot pop element from empty array.');
  return val;
}