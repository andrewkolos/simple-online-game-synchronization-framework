import { MessageBuffer } from './message-buffer';
import { BufferMessage } from './messages';

/**
 * Maps string keys to types implementing the `BufferMessage` interface.
 */
export interface RouterTypeMap {
  [key: string]: BufferMessage;
}

/**
 * Given a message buffer (where received and sent messages can be of several types), the message router can generate
 * message buffers that are more specific to a type shared by two `RouterTypeMap`s, one for received types, and one
 * for sent types.
 * @template ReceiveTypeMap Describes what type of `BufferMessage` is received by a `MessageBuffer` filtered by a given string key.
 * @template SendTypeMap Describes what type of `BufferMessage` is sent by a `MessageBuffer` filtered by a given string key.
 */
export interface MessageRouter<ReceiveTypeMap extends RouterTypeMap, SendTypeMap extends RouterTypeMap> {
  getFilteredMessageBuffer<R extends keyof ReceiveTypeMap, S extends keyof SendTypeMap>(bufferType: R & S)
    : MessageBuffer<ReceiveTypeMap[R], SendTypeMap[S]>;
}
