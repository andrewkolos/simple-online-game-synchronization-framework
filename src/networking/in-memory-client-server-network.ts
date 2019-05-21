import { InputMessage, StateMessage, ServerConnection, ClientConnection } from './connection';

export class InMemoryClientServerNetwork {
  private inputMessageQueues: InputMessage[][] = [];
  private stateMessageQueues: StateMessage[][] = [];

  private inputMessageReadyTimes: Map<InputMessage, number> = new Map();
  private stateMessageSendTimes: Map<StateMessage, number> = new Map();
  private stateMessageReferenceCounts: Map<StateMessage, number> = new Map();

  /**
   * Get a connection to the server.
   */
  public getNewServerConnection(lagMs: number): ServerConnection {
    const that = this;
    this.stateMessageQueues.push([]);
    const clientIndex = this.stateMessageQueues.length - 1;
    const stateMessageQueue = this.stateMessageQueues[clientIndex];

    return {
      send: (message: InputMessage) => {
        const inputMessageQueue = this.inputMessageQueues[clientIndex];
        if (this.stateMessageQueues == null) {
          throw Error('Cannot send input to server before the client connection has been created.');
        }
        inputMessageQueue.push(message);
        if (this.inputMessageReadyTimes.get(message)) throw Error('bad');
        this.inputMessageReadyTimes.set(message, new Date().getTime() + lagMs);
      },
      receive: function() {
        if (!this.hasNext()) throw Error('No message ready.');
        const message = stateMessageQueue[0];
        stateMessageQueue.splice(0, 1);
        decrementOrRemove(that.stateMessageReferenceCounts, message);
        return message;
      },
      hasNext: () => {
        return (stateMessageQueue.length > 0 &&
          this.stateMessageSendTimes.get(stateMessageQueue[0])!.valueOf() <= new Date().getTime() + lagMs);
      }
    };
  }
  public getNewClientConnection(): ClientConnection {
    this.inputMessageQueues.push([]);
    const imQueue = this.inputMessageQueues[this.inputMessageQueues.length - 1];
    return {
      send: (message: StateMessage) => {
        for (const mq of this.stateMessageQueues) {
          mq.push(message);
        }
        if (this.stateMessageSendTimes.get(message)) throw Error('badd');
        this.stateMessageSendTimes.set(message, new Date().getTime());
        if (this.stateMessageReferenceCounts.get(message)) throw Error('badd');
        this.stateMessageReferenceCounts.set(message, this.stateMessageQueues.length);
      },
      receive: function() {
        if (!this.hasNext()) throw Error('No input message is ready.');
        const message = imQueue[0];
        imQueue.splice(0,1);
        return message;
      },
      hasNext: () => {
        return (imQueue.length > 0 &&
          this.inputMessageReadyTimes.get(imQueue[0])!.valueOf() <= new Date().getTime());
      }
    };
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