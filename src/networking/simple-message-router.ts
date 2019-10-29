import { TwoWayMessageBuffer, RecipientMessageBuffer } from './message-buffer';
import { TwoWayRouterTypeMap, PickSendTypeGivenKey, PickReceiveType, PickSendType } from './router-type-map';
import { BufferMessage } from './messages';
import { DefaultMap } from '../util/default-map';
import { ArrayOrSingle, arrayify } from '../util';
import { PlayerClientEntitySyncer } from '../synchronizers/client/player-client-entity-synchronizer';
import { RouterTypeMap } from './message-router';

type PickKinds<M extends BufferMessage> = M['kind'];
type MessagesWithKind<M extends BufferMessage, K extends M['kind']> = M extends { kind: K } ? M : never;

export class RecipientMessageRouter<M extends BufferMessage> {

  private readonly messageCategorizer: MessageCategorizer<M>;

  public constructor(buffer: RecipientMessageBuffer<M>) {
    this.messageCategorizer = new MessageCategorizer(buffer);
  }

  public getCategorizedBuffer<K extends PickKinds<M>>(messageKind: K): RecipientMessageBuffer<MessagesWithKind<M, K>> {
    return {
      receive: () => this.messageCategorizer.getMessages(messageKind),
      [Symbol.iterator]() { return this.receive().values(); },
    };
  }

}

/**
 * Given a message buffer, generates filtered message buffers that are
 * specific to a pair of types mapped to by a key in a `RouterTypeMap`.
 * @template T Describes what types of `BufferMessage`s are received/sent by a
 * `TwoWayMessageBuffer` created from the `TwoWayMessageRouter` with some key of the mapping.
 */
export class TwoWayMessageRouter<TypeMap extends TwoWayRouterTypeMap> {

  private readonly messageCategorizer: MessageCategorizer<PickReceiveType<TypeMap>>;

  public constructor(private readonly buffer: TwoWayMessageBuffer<PickReceiveType<TypeMap>, PickSendType<TypeMap>>) {
  }

  public getFilteredTwoWayMessageBuffer<K extends (keyof TypeMap & string)>(messageKind: K) {

    return {
      send: (message: PickSendTypeGivenKey<TypeMap, K> | Array<PickSendTypeGivenKey<TypeMap, K>>) => {
        this.buffer.send(message);
      },
      receive: () => this.messageCategorizer.getMessages(messageKind),
      [Symbol.iterator]() { return this.receive().values(); },
    };
  }

}
