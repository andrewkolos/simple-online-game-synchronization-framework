import { TypedEventEmitter } from '../event-emitter';
import { MessageBuffer } from './message-buffer';

interface InMemoryClientServerNetworkEvents<ClientSendType, ServerSendType> {
  serverSentMessageSent(message: ServerSendType): void;
  clientSentMessageSent(message: ClientSendType): void;
}

/**
 * An in-memory network that can be used to connect client and server entity synchronizers.
 */
export class InMemoryClientServerNetwork<ClientSendType, ServerSendType> {

  public readonly eventEmitter = new TypedEventEmitter<InMemoryClientServerNetworkEvents<ClientSendType, ServerSendType>>();

  private readonly clientSentMessageQueues: ClientSendType[][] = [];
  private readonly serverSentMessageQueues: ServerSendType[][] = [];

  private readonly clientSentMessageReadyTimes: Map<ClientSendType, number> = new Map();
  private readonly serverSentMessageSendTimes: Map<ServerSendType, number> = new Map();
  private readonly serverSentMessageReferenceCounts: Map<ServerSendType, number> = new Map();

  // tslint:disable-next-line: member-ordering
  /**
   * Gives a new connection to the server.
   */
  public getNewConnectionToServer(lagMs: number): MessageBuffer<ServerSendType, ClientSendType> {
    const that = this;
    this.serverSentMessageQueues.push([]);
    const clientIndex = this.serverSentMessageQueues.length - 1;
    const stateMessageQueue = this.serverSentMessageQueues[clientIndex];

    return {
      send: (message: ClientSendType) => {
        const inputMessageQueue = this.clientSentMessageQueues[clientIndex];
        if (inputMessageQueue == null) {
          throw Error('Cannot send input to server before the client connection has been created.');
        }
        inputMessageQueue.push(message);
        this.clientSentMessageReadyTimes.set(message, new Date().getTime() + lagMs);
        this.eventEmitter.emit('clientSentMessageSent', message);
      },
      receive: function () {
        if (!this.hasNext()) throw Error('No message ready.');
        const message = stateMessageQueue[0];
        stateMessageQueue.splice(0, 1);
        decrementOrRemove(that.serverSentMessageReferenceCounts, message);

        return message;
      },
      hasNext: () => {
        if (stateMessageQueue.length < 1) return false;
        const nextMessage = stateMessageQueue[0];
        const nextMessageSentAt = this.serverSentMessageSendTimes.get(nextMessage)!.valueOf();

        return nextMessageSentAt + lagMs <= new Date().getTime();
      }
    };
  }

  /**
   * Get a connection to a client.
   */
  public getNewClientConnection(): MessageBuffer<ClientSendType, ServerSendType> {
    this.clientSentMessageQueues.push([]);
    const clientIndex = this.clientSentMessageQueues.length - 1;
    const imQueue = this.clientSentMessageQueues[clientIndex];

    return {
      send: (message: ServerSendType) => {
        this.serverSentMessageQueues[clientIndex].push(message);

        this.serverSentMessageSendTimes.set(message, new Date().getTime());
        increment(this.serverSentMessageReferenceCounts, message);
        this.eventEmitter.emit('serverSentMessageSent', message);
      },
      receive: function () {
        if (!this.hasNext()) throw Error('No input message is ready.');
        const message = imQueue[0];
        imQueue.splice(0, 1);
        return message;
      },
      hasNext: () => {
        return (imQueue.length > 0 &&
          this.clientSentMessageReadyTimes.get(imQueue[0])!.valueOf() <= new Date().getTime());
      }
    };
  }

  public getInputMessageQueueLengths(): number[] {
    return this.clientSentMessageQueues.map(q => q.length);
  }

  public getStateMessageQueueLengths(): number[] {
    return this.serverSentMessageQueues.map(q => q.length);
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

function increment<K>(map: Map<K, number>, key: K): void {
  const value = map.get(key);
  if (value == undefined) {
    map.set(key, 1);
  } else {
    map.set(key, value + 1);
  }
}