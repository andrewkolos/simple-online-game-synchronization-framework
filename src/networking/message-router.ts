import { ValueOf } from '../util';
import { MessageBuffer } from './message-buffer';
import { BufferMessage } from './messages';

/**
 * Maps a set of `string` keys to a pair of types implementing the `BufferMessage` interface: one to a type
 * meant to be received by a router, and one to a type to be sent by the router.
 */
export type RouterTypeMap = {
  [key: string]: { receiveType: BufferMessage; sendType: BufferMessage }
};

/**
 * Invert the `receiveType` and `sendType` mappings of a `RouterTypeMap`. This is useful for creating a
 * type mapping of a router that is communicating with a router using the given `RouterTypeMap`.
 */
export type InvertRouterTypeMap<T extends RouterTypeMap> = {
  [key in keyof T]: { receiveType: T[key]["sendType"]; sendType: T[key]["receiveType"] };
};

export type PickTypeFromMap<T extends {[key: string]: any}, K extends string> = ValueOf<T>[K];

export type PickSendType<T extends RouterTypeMap> = PickTypeFromMap<T, "sendType">;

export type PickReceiveType<T extends RouterTypeMap> = PickTypeFromMap<T, "receiveType">;

export type PickSendTypeGivenKey<T extends RouterTypeMap, K extends keyof T> = T[K]["sendType"];
export type PickReceiveTypeGivenKey<T extends RouterTypeMap, K extends keyof T> = T[K]["receiveType"];

/**
 * Given a message buffer, a `MessageRouter` can generate filtered message buffers that are
 * specific to a pair of types mapped to by a key in a `RouterTypeMap`.
 * @template TypeMap Describes what types of `BufferMessage`s are received/sent by a `MessageBuffer` created from the `MessageRouter`
 *                   with some key of the mapping.
 */
export interface MessageRouter<TypeMap extends RouterTypeMap> {
  /**
   * Generates a new `MessageBuffer` which can only receive/send messages of (likely) more specific types, determined
   * by the argued `bufferType`, which is a key of the router's type mapping.
   * @param bufferType The key of the type mapping that describes what types of messages the new `MessageBuffer` will be
   *                   able to receive/send.
   */
  getFilteredMessageBuffer<K extends keyof TypeMap>(bufferType: K): MessageBuffer<TypeMap[K]["receiveType"], TypeMap[K]["sendType"]>;
}
