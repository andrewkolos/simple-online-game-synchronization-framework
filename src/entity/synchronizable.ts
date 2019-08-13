import { StateMessage } from 'src/networking';

export type SyncToServerStrategy<State> = (stateMessage: StateMessage<State>) => State;

export interface ServerSyncable<State> {
  synchronizeToServer(stateMessage: StateMessage<State>): void;
}