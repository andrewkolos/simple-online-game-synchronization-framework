import { InputMessage, StateMessage, ServerConnection, ClientConnection, Connection } from './connection';

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
      },
      peek: (position: number) => {
        return this.stateMessageQueues[clientIndex][position];
      }
    };
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
      },
      peek: (position: number) => {
        return this.inputMessageQueues[imQueueIndex][position];
      }
    };
  }
}


export class LagConnection<SendType, ReceiveType> implements Connection<SendType, ReceiveType> {

  private constructor(private connection: Connection<SendType, ReceiveType>, private lagMs: number) {
  }

  public static fromExistingConnection<SendType, ReceiveType>(connection: Connection<SendType, ReceiveType>,
    lagMs: number): Connection<SendType, ReceiveType> {
    return new LagConnection(connection, lagMs);
  }

  public getOriginalConnection(): Connection<SendType, ReceiveType> {
    return this.connection;
  }

  public send(message: SendType) {
    setTimeout(() => {
      this.connection.send(message);
    }, this.lagMs);
  }

  public receive() {
    return this.connection.receive();
  }

  public hasNext() {
    return this.connection.hasNext();
  }

  public peek(position: number) {
    return this.connection.peek(position);
  }
}

function unsafePop<T>(array: Array<T>): T {
  const val = array.pop();
  if (val == null)
    throw Error('Cannot pop element from empty array.');
  return val;
}
