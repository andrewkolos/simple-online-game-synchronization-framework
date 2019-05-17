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
}

export interface ServerConnection extends Connection<InputMessage, StateMessage> {}
export interface ClientConnection extends Connection<StateMessage, InputMessage> {}

export class InMemoryClientServerNetwork {

  private inputMessageQueues: InputMessage[][] = [];
  private stateMessageQueues: StateMessage[][] = [];
  
  /**
   * Get a connection to the server.
   */
  public getNewServerConnection(): ServerConnection {
    this.stateMessageQueues.push([]);
    const clientIndex = this.stateMessageQueues.length - 1;

    return {
      send: (message: InputMessage) => {
        if (this.inputMessageQueues[clientIndex] == null) {
          throw Error('Cannot send input to server before the client connection has been created.');
        }
        this.inputMessageQueues[clientIndex].push(message);
      },
      receive: () => {
        return unsafePop(this.stateMessageQueues[clientIndex]);
      },
      hasNext: () => {
        return this.stateMessageQueues[clientIndex].length > 0;
      }
    }
  }

  public getNewClientConnection(): ClientConnection {
    this.inputMessageQueues.push([]);
    const imQueueIndex = this.inputMessageQueues.length - 1;

    return {
      send: (message: StateMessage) => {
        for (const mq of this.stateMessageQueues) {
          mq.push(message);
        }
      },
      receive: () => {
        return unsafePop(this.inputMessageQueues[imQueueIndex]);
      },
      hasNext: () => {
        return this.inputMessageQueues[imQueueIndex].length > 0;
      }
    }
  }
}

function unsafePop<T>(array: Array<T>): T {
  const val = array.pop();
  if (val == null) throw Error('Cannot pop element from empty array.');
  return val;
}