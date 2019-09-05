import { TwoWayMessageBuffer } from './message-buffer';
import { PickReceiveType, PickReceiveTypeGivenKey, PickSendType, RouterTypeMap } from './message-router';

/**
 * A simple implementation of `MessageRouter`. Any filtered message buffer generated from the router will
 * receive all messages available in the underlying `TwoWayMessageBuffer` when queried for
 * a message (or the presence of one). These messages will be filtered into array buffers by type, which
 * `TwoWayMessageBuffers` generated by the `MessageRouter` will query for messages.
 * @template TypeMap @inheritdoc
 */
export class SimpleMessageRouter<TypeMap extends RouterTypeMap> {

  private readonly collections: Map<keyof TypeMap, Array<PickReceiveType<TypeMap>>> = new Map();

  public constructor(private readonly messageCategorizer: MessageCategorizer<TypeMap>,
    private readonly buffer: TwoWayMessageBuffer<PickReceiveType<TypeMap>, PickSendType<TypeMap>>) {
  }

  public getFilteredTwoWayMessageBuffer<K extends keyof TypeMap>(bufferType: K) {

    const receive = () => {
      this.receiveAndOrganizeAllMessages();

      const collection = this.collections.get(bufferType) as Array<PickReceiveTypeGivenKey<TypeMap, K>>;

      return collection == null ? [] : collection;
    };

    return {
      send: (message: PickSendType<TypeMap> | Array<PickSendType<TypeMap>>) => {
        this.buffer.send(message);
      },
      receive,
      [Symbol.iterator]() { return this.receive().values(); },
    };
  }

  private receiveAndOrganizeAllMessages(): void {
    for (const message of this.buffer) {
      const category = this.messageCategorizer(message);
      const collection = this.collections.has(category) ? this.collections.get(category)! : [];
      collection.push(message);
      this.collections.set(category, collection);
    }
  }

}

export type MessageCategorizer<TypeMap extends RouterTypeMap> = (message: PickReceiveType<TypeMap>) => keyof TypeMap;
