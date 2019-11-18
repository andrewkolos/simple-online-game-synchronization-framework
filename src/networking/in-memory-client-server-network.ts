import { TwoWayMessageBuffer } from './message-buffer';
import { EventEmitter } from 'typed-event-emitter';
import { arrayify } from '../util-types';

/**
 * An in-memory network that can be used to connect client and server entity synchronizers.
 */
export class InMemoryClientServerNetwork<ClientSendType, ServerSendType>
  extends EventEmitter {

  public readonly onClientSentMessages = this.registerEvent<(messages: ClientSendType[]) => void>();
  public readonly onServerSentMessages = this.registerEvent<(messages: ServerSendType[]) => void>();
  public readonly onMessageSent = this.registerEvent<() => void>();

  private readonly clientSentMessageQueues: ClientSendType[][][] = [];
  private readonly serverSentMessageQueues: ServerSendType[][][] = [];

  private readonly clientSentMessageReadyTimes: Map<ClientSendType[], number> = new Map();
  private readonly serverSentMessageSendTimes: Map<ServerSendType[], number> = new Map();
  private readonly serverSentMessageReferenceCounts: Map<ServerSendType[], number> = new Map();

  /**
   * Gives a new connection to the server.
   */
  public getNewConnectionToServer(lagMs: number): TwoWayMessageBuffer<ServerSendType, ClientSendType> {
    this.serverSentMessageQueues.push([]);
    const clientIndex = this.serverSentMessageQueues.length - 1;
    const stateMessageQueue = this.serverSentMessageQueues[clientIndex];

    return {
      send: (messages: ClientSendType | ClientSendType[]) => {
        const asArray = arrayify(messages);

        const inputMessageQueue = this.clientSentMessageQueues[clientIndex];
        if (inputMessageQueue == null) {
          throw Error('Cannot send input to server before the client connection has been created.');
        }
        inputMessageQueue.push(asArray);
        this.clientSentMessageReadyTimes.set(asArray, new Date().getTime() + lagMs);
        this.emit(this.onClientSentMessages, asArray);
      },
      receive: () => {
        if (stateMessageQueue.length > 0) {
          const nextMessages = stateMessageQueue[0];
          const sendTime = this.serverSentMessageSendTimes.get(nextMessages)!.valueOf();
          if (sendTime + lagMs <= new Date().getTime()) {
            stateMessageQueue.splice(0, 1);
            decrementOrRemove(this.serverSentMessageReferenceCounts, nextMessages);
            return nextMessages;
          } else {
            return [];
          }
        }
        return [];
      },
      [Symbol.iterator]() {
        return this.receive().values();
      },
    };
  }

  /**
   * Get a connection to a client.
   */
  public getNewClientConnection(): TwoWayMessageBuffer<ClientSendType, ServerSendType> {
    this.clientSentMessageQueues.push([]);
    const clientIndex = this.clientSentMessageQueues.length - 1;
    const imQueue = this.clientSentMessageQueues[clientIndex];

    return {
      send: (messages: ServerSendType | ServerSendType[]) => {
        const asArray = arrayify(messages);
        this.serverSentMessageQueues[clientIndex].push(asArray);

        this.serverSentMessageSendTimes.set(asArray, new Date().getTime());
        increment(this.serverSentMessageReferenceCounts, asArray);
        this.emit(this.onServerSentMessages, asArray);
      },
      receive: () => {
        if (imQueue.length > 0) {
          const nextMessages = imQueue[0];
          const readyTime = this.clientSentMessageReadyTimes.get(nextMessages)!;

          if (readyTime <= new Date().getTime()) {
            imQueue.splice(0, 1);
            return nextMessages;
          } else {
            return [];
          }
        }
        return [];
      },
      [Symbol.iterator]() {
        return this.receive().values();
      },
    };
  }

  public getClientSentMessageQueueLengths(): number[] {
    return this.clientSentMessageQueues.map((q) => q.length);
  }

  public getServerSentMessageQueueLengths(): number[] {
    return this.serverSentMessageQueues.map((q) => q.length);
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
