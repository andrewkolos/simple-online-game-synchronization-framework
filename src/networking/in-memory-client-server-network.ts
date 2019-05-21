import { InputMessage, StateMessage, ServerConnection, ClientConnection } from './connection';

export class InMemoryClientServerNetwork {
  private inputMessageQueues: InputMessage[][] = [];
  private stateMessageQueues: StateMessage[][] = [];

  private messageReadyTimes: Map<InputMessage | StateMessage, number> = new Map();
  private stateMessageReferenceCounts: Map<StateMessage, number> = new Map();

  /**
   * Get a connection to the server.
   */
  public getNewServerConnection(lagMs: number): ServerConnection {
    this.stateMessageQueues.push([]);
    const clientIndex = this.stateMessageQueues.length - 1;
    return {
      send: (message: InputMessage) => {
        if (this.inputMessageQueues[clientIndex] == null) {
          throw Error('Cannot send input to server before the client connection has been created.');
        }
        this.inputMessageQueues[clientIndex].push(message);
        this.messageReadyTimes.set(message, new Date().getTime() + lagMs);
      },
      receive: () => {
        const message = this.getFirstMessageThatIsReady(this.stateMessageQueues[clientIndex], lagMs);
        decrementOrRemove(this.stateMessageReferenceCounts, message);
        return message;
      },
      hasNext: () => {
        return this.hasMessageThatIsReady(this.stateMessageQueues[clientIndex], lagMs);
      }
    };
  }
  public getNewClientConnection(lagMs: number): ClientConnection {
    this.inputMessageQueues.push([]);
    const imQueueIndex = this.inputMessageQueues.length - 1;
    return {
      send: (message: StateMessage) => {
        for (const mq of this.stateMessageQueues) {
          mq.push(message);
        }
        this.messageReadyTimes.set(message, new Date().getTime() + lagMs);
        this.stateMessageReferenceCounts.set(message, this.stateMessageQueues.length);
      },
      receive: () => {
        const message = this.getFirstMessageThatIsReady(this.inputMessageQueues[imQueueIndex], lagMs);
        this.messageReadyTimes.delete(message);
        return message;
      },
      hasNext: () => {
        return this.hasMessageThatIsReady(this.inputMessageQueues[imQueueIndex], lagMs);
      }
    };
  }

  private getFirstMessageThatIsReady<T extends InputMessage | StateMessage>(queue: T[], lagMs: number) {
    const readyMessageIndex = this.getIndexOfFirstMessageThatIsReady(queue, lagMs);
    if (readyMessageIndex != -1) {
      throw Error('Tried to receive a message when none are ready.');
    }
    const message = queue[readyMessageIndex];
    queue.splice(readyMessageIndex, 1);
    return message;
  }

  private getIndexOfFirstMessageThatIsReady<T extends InputMessage | StateMessage>(queue: T[], lagMs: number) {
    const now = new Date().getTime();
    const readyMessageIndex = queue.findIndex(message => {
      const readyTime = this.messageReadyTimes.get(message);
      if (readyTime == null) {
        throw Error('Found a message without a ready time.');
      } else {
        if (readyTime >= now + lagMs) {
          return true;
        }
      }
      return false;
    });

    return readyMessageIndex;
  }

  private hasMessageThatIsReady<T extends InputMessage | StateMessage>(queue: T[], lagMs: number) {
    return this.getIndexOfFirstMessageThatIsReady(queue, lagMs) != -1;
  }
}

function decrementOrRemove<K>(map: Map<K, number>, key: K): void {
  const value = map.get(key);
  if (value == undefined) {
    throw Error('Tried to decrement map value that does not exist.');
  }
  if (value === 1) {
    map.delete(key);
  }
  
  map.set(key, value - 1);
}
