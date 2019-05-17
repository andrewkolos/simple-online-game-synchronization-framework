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
  
  public getNewServerConnection(): ServerConnection {
    this.stateMessageQueues.push([]);
    const smQueueIndex = this.stateMessageQueues.length - 1;

    return {
      send: (message: InputMessage) => {
        this.inputMessageQueues.forEach(mq => {
          mq.push(message);
        });
      },
      receive: () => {
        return unsafePop(this.stateMessageQueues[smQueueIndex]);
      },
      hasNext: () => {
        return this.stateMessageQueues[smQueueIndex].length > 0;
      }
    }
  }

  public getNewClientConnection(): ClientConnection {
    this.inputMessageQueues.push([]);
    const imQueueIndex = this.inputMessageQueues.length -1;

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