import { MessageBuffer } from './message-buffer';

export interface MessageRouter<ReceiveTypeMap, SendTypeMap> {
  getMessageBuffer<R extends keyof ReceiveTypeMap, S extends keyof SendTypeMap>(bufferType: R & S)
    : MessageBuffer<ReceiveTypeMap[R], SendTypeMap[S]>;
}
