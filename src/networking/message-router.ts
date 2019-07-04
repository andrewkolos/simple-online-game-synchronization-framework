import { MessageBuffer } from './message-buffer';
import { BufferMessage } from './messages';

/**
 * Maps string keys to types implementing the `BufferMessage` interface.
 */
export type RouterTypeMap<T extends string> = {
  [key in T]: BufferMessage;
};

/**
 * Given a message buffer (where received and sent messages can be of several types), the message router can generate
 * message buffers that are more specific to a type shared by two `RouterTypeMap`s, one for received types, and one
 * for sent types.
 * @template ReceiveTypeMap Describes what type of `BufferMessage` is received by a `MessageBuffer` filtered by a given string key.
 * @template SendTypeMap Describes what type of `BufferMessage` is sent by a `MessageBuffer` filtered by a given string key.
 */
export interface MessageRouter<MessageTypeKey extends string,
                               ReceiveTypeMap extends RouterTypeMap<MessageTypeKey>, 
                               SendTypeMap extends RouterTypeMap<MessageTypeKey>> {

  getFilteredMessageBuffer<K extends MessageTypeKey & keyof ReceiveTypeMap & keyof SendTypeMap>(bufferType: K)
    : MessageBuffer<ReceiveTypeMap[K], SendTypeMap[K]>;
}
