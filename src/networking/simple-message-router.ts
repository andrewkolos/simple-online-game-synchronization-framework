import { MessageBuffer, asIterableIterator } from './message-buffer';
import { PickReceiveType, PickReceiveTypeGivenKey, PickSendType, PickSendTypeGivenKey, RouterTypeMap } from './message-router';

/**
 * A simple implementation of `MessageRouter`. Any filtered message buffer generated from the router will receive all messages
 * available in the underlying `MessageBuffer` when queried for a message (or the presence of one). These messages will be filtered
 * into array buffers by type, which `MessageBuffers` generated by the `MessageRouter` will query for messages.
 * @template TypeMap @inheritdoc
 */
export class SimpleMessageRouter<TypeMap extends RouterTypeMap> {

  private readonly collections: Partial<Record<keyof TypeMap, PickReceiveType<TypeMap>[]>>;

  public constructor(private readonly categorizer: MessageCategorizer<TypeMap>,
    private readonly buffer: MessageBuffer<PickReceiveType<TypeMap>, PickSendType<TypeMap>>) {
    this.collections = {};
  }

  public getFilteredMessageBuffer<K extends keyof TypeMap>(bufferType: K)
    : MessageBuffer<PickReceiveTypeGivenKey<TypeMap, K>, PickSendTypeGivenKey<TypeMap, K>> {

    const hasNext = () => {
      this.receiveAndOrganizeAllMessages();

      const collection = this.collections[bufferType];

      return collection != null && collection.length > 0;
    }

    const receive = () => {
      this.receiveAndOrganizeAllMessages();

      const collection = this.collections[bufferType];
      if (collection == null || collection.length === 0) {
        throw Error(`There are no messages belonging to the ${bufferType} buffer available.`);
      }

      return collection.splice(0, 1)[0];
    };

    return asIterableIterator({
      send: (message: PickSendType<TypeMap>) => {
        this.buffer.send(message);
      },
      hasNext,
      receive
    });
  }

  private receiveAndOrganizeAllMessages(): void {
    while (this.buffer.hasNext()) {
      const message = this.buffer.receive();

      const category = this.categorizer.assignMessageCategory(message);

      if (this.collections[category] == null) {
        this.collections[category] = [];
      }

      this.collections[category]!.push(message);
    }
  }

}

export interface MessageCategorizer<TypeMap extends RouterTypeMap> {
  assignMessageCategory(message: PickReceiveType<TypeMap>): keyof TypeMap;
}