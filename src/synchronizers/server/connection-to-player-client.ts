import { TwoWayMessageBuffer, InputMessage, StateMessage } from '../../networking';

export type ConnectionToPlayerClient<Input, State> = TwoWayMessageBuffer<InputMessage<Input>, StateMessage<State>>;
