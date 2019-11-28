import { Entity } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { StateMessage } from '../../networking';
import { RecipientMessageBuffer } from '../../networking/message-buffer';
import { MultiEntityStateInterpolator } from './state-interpolator';

export interface ClientEntitySyncerArgs<State> {
  connection: RecipientMessageBuffer<StateMessage<State>>;
  serverUpdateRateHz: number;
}

export interface ClientEntitySyncerPreHandshake<State extends NumericObject> {
  handshake(): Promise<ClientEntitySyncer<State>>;
}

export class ClientEntitySyncer<State extends NumericObject> {

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
