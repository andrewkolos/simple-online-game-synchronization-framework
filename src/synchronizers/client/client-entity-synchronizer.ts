import { Entity } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { StateMessage } from '../../networking';
import { RecipientMessageBuffer } from '../../networking/message-buffer';
import { PlayerClientEntitySyncer, PlayerClientEntitySyncerArgs } from './player-client-entity-synchronizer';
import { MultiEntityStateInterpolator } from './state-interpolator';

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
