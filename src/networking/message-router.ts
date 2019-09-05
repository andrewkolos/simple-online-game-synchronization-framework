import { ValueOf } from '../util';
import { TwoWayMessageBuffer, RecipientMessageBuffer, SenderMessageBuffer } from './message-buffer';
import { BufferMessage } from './messages';

/**
 * Maps a set of `string` keys to a pair of types implementing the `BufferMessage` interface: one to a type
 * meant to be received by a router, and one to a type to be sent by the router.
 */
export interface RouterTypeMap {
  [key: string]: SingleRouterTypeMapping;
}

export interface ReceiveTypeMapping {
  receiveType: BufferMessage;
}

export interface SendTypeMapping {
  sendType: BufferMessage;
}

export type SingleRouterTypeMapping = ReceiveTypeMapping | SendTypeMapping | (ReceiveTypeMapping & SendTypeMapping);

/**
 * Invert the `receiveType` and `sendType` mappings of a `RouterTypeMap`. This is useful for creating a
 * type mapping of a router that is communicating with a router using the given `RouterTypeMap`.
 */
export type InvertRouterTypeMap<T extends RouterTypeMap> = {
  [key in keyof T]: {
    receiveType: T[key] extends SendTypeMapping ? T[key]['sendType'] : never;
    sendType: T[key] extends ReceiveTypeMapping ? T[key]['receiveType'] : never;
  };
};

interface TypeMap { [key: string]: any; }

export type PickTypeFromMap<T extends TypeMap, K extends string> = ValueOf<T>[K];

export type PickSendType<T extends RouterTypeMap> = PickTypeFromMap<T, 'sendType'>;
export type PickReceiveType<T extends RouterTypeMap> = PickTypeFromMap<T, 'receiveType'>;

export type PickSendTypeGivenKey<T extends RouterTypeMap, K extends keyof T> = T[K] extends SendTypeMapping ? T[K]['sendType'] : never;
export type PickReceiveTypeGivenKey<T extends RouterTypeMap, K extends keyof T> = T[K] extends ReceiveTypeMapping ?
  T[K]['receiveType'] : never;

/**
 * Given a message buffer, a `MessageRouter` can generate filtered message buffers that are
 * specific to a pair of types mapped to by a key in a `RouterTypeMap`.
 * @template T Describes what types of `BufferMessage`s are received/sent by a
 * `TwoWayMessageBuffer` created from the `MessageRouter` with some key of the mapping.
 */
export interface MessageRouter<T extends RouterTypeMap> {
  /**
   * Generates a new `MessageBuffer` which can only receive/send messages of (likely) more specific types, determined
   * by the argued `bufferType`, which is a key of the router's type mapping.
   * @param bufferType The key of the type mapping that describes what types of messages the new `MessageBuffer` will be
   *                   able to receive/send.
   */
  getFilteredMessageBuffer<K extends keyof T>(bufferType: K): T[K] extends SendTypeMapping ?
    (T[K] extends ReceiveTypeMapping ?
      TwoWayMessageBuffer<PickReceiveTypeGivenKey<T, K>, PickSendTypeGivenKey<T, K>> :
      SenderMessageBuffer<PickSendTypeGivenKey<T, K>>) :
    T[K] extends ReceiveTypeMapping ? RecipientMessageBuffer<PickReceiveTypeGivenKey<T, K>> : never;
}
