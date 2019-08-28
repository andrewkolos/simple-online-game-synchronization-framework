import { StateMessage } from '../networking';
export function findLatestMessage<State, Message extends StateMessage<State>>(stateMessages: Message[]): Message {
  return stateMessages.reduce((acc: Message, current: Message) => (
    acc == null || current.sentAt > acc.sentAt) ? current : acc);
}
