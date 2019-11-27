import { Entity } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { StateMessage, HandshakeData } from '../../networking';
import { RecipientMessageBuffer } from '../../networking/message-buffer';
import { MultiEntityStateInterpolator } from './state-interpolator';
import { makeClientEntitySyncerFromHandshaking } from './handshaking-factory-functions';

export interface ClientEntitySyncerArgs<State> {
  connection: RecipientMessageBuffer<StateMessage<State> | HandshakeData>;
  handshakeTimeoutMs?: number;
}

export interface ClientEntitySyncerArgsWithServerInfo<State extends NumericObject> {
  connection: RecipientMessageBuffer<StateMessage<State>>;
  serverUpdateRateHz: number;
}

export interface ClientEntitySyncerPreHandshake<State extends NumericObject> {
  handshake(): Promise<ClientEntitySyncer<State>>;
}

export class ClientEntitySyncer<State extends NumericObject> {

  public static create<State extends NumericObject>(args: ClientEntitySyncerArgs<State>):
    ClientEntitySyncerPreHandshake<State> {
    return {
      handshake: async () => makeClientEntitySyncerFromHandshaking(args),
    };
  }

  public static createWithServerInfo<State extends NumericObject>(args: ClientEntitySyncerArgsWithServerInfo<State>) {
    return new ClientEntitySyncer(args);
  }

  private readonly stateMessageSource: RecipientMessageBuffer<StateMessage<State>>;
  private readonly interpolator: MultiEntityStateInterpolator<State>;

  private constructor(args: ClientEntitySyncerArgsWithServerInfo<State>) {
    this.stateMessageSource = args.connection;
    this.interpolator = MultiEntityStateInterpolator.withBasicInterpolationStrategy(args.serverUpdateRateHz);
  }

  public synchronize(): Array<Entity<State>> {
    const stateMessages = this.stateMessageSource.receive();
    return this.interpolator.interpolate(stateMessages.map((sm) => sm.entity));
  }
}
