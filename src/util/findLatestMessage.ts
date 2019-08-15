import { StateMessage } from '../networking';
export function findLatestMessage<State>(stateMessages: Array<StateMessage<State>>) {
  return stateMessages.reduce((acc: StateMessage<State>, current: StateMessage<State>) => (
    acc == null || current.sentAt > acc.sentAt) ? current : acc);
}
