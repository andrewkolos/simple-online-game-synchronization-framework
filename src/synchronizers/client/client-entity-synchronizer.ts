import { StateMessage, RecipientMessageBuffer, TwoWayMessageBuffer, InputMessage } from '../../networking';
import { EntityBoundInput } from './entity-bound-input';
import { MultiEntityStateInterpolator } from './state-interpolator';
import { NumericObject } from '../../interpolate-linearly';
import { InputApplicator } from '../../entity';
import { PlayerClientEntitySyncerArgs, PlayerClientEntitySyncer } from './player-client-entity-synchronizer';

export type EntityId = string;

export interface Entity<State> {
  id: EntityId;
  state: State;
}

export interface LocalPlayerInputStrategy<Input, State> {
  inputSource: (entities: Array<Entity<State>>) => Array<EntityBoundInput<Input>>;
  inputApplicator: InputApplicator<Input, State>;
}

export type PlayerClientSyncerConnectionToServer<Input, State> = TwoWayMessageBuffer<StateMessage<State>, InputMessage<Input>>;

export interface ClientEntitySyncerArgsBase {
  serverUpdateRateHz: number;
}

export interface ClientEntitySyncerArgs<State> extends ClientEntitySyncerArgsBase {
  connection: RecipientMessageBuffer<StateMessage<State>>;
}

export class ClientEntitySyncer<State extends NumericObject> {

  public static withoutLocalPlayerSupport<State extends NumericObject>(args: ClientEntitySyncerArgs<State>) {
    return new ClientEntitySyncer<State>(args);
  }

  public static withLocalPlayerSupport<State extends NumericObject, Input>(args: PlayerClientEntitySyncerArgs<Input, State>) {
    return new PlayerClientEntitySyncer(args);
  }

  private readonly stateMessageSource: RecipientMessageBuffer<StateMessage<State>>;
  private readonly interpolator: MultiEntityStateInterpolator<State>;

  private constructor(args: ClientEntitySyncerArgs<State>) {
    this.stateMessageSource = args.connection;
    this.interpolator = MultiEntityStateInterpolator.withBasicInterpolationStrategy(args.serverUpdateRateHz);
  }

  public synchronize(): Array<Entity<State>> {
    const stateMessages = this.stateMessageSource.receive();
    return this.interpolator.interpolate(stateMessages.map((sm) => sm.entity));
  }
}
