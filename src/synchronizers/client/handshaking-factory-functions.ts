import { ClientEntitySyncerArgs, ClientEntitySyncer } from './client-entity-synchronizer';
import { RecipientMessageBuffer } from '../../networking/message-buffer';
import { StateMessage, HandshakeInfo, EntityMessageKind } from '../../networking';
import { MessageCategorizer, MessageCategoryAssigner } from '../../networking/message-categorizer';
import { handshakeMessageKind } from '../../handshaking/message-types';
import { receiveHandshake } from '../../handshaking/receive-handshake';
import { NumericObject } from '../../interpolate-linearly';
import { PlayerClientEntitySyncerArgs, PlayerClientEntitySyncer } from './player-client-entity-synchronizer';

type StateMessageAndHandshakeRecipBuffer<EntityState> = RecipientMessageBuffer<StateMessage<EntityState> | HandshakeInfo>;

type WithHandshake<T extends PlayerClientEntitySyncerArgs<unknown, unknown> | ClientEntitySyncerArgs<unknown>> =
  Exclude<T,
    'serverEntityUpdateRateHz' | 'connection'> & {
      connection: RecipientMessageBuffer<StateMessage<PickEntityStateFromArgs<T>> | HandshakeInfo>;
      handshakeTimeoutMs?: number;
    };

type PickEntityStateFromArgs<T> = T extends ClientEntitySyncerArgs<infer EntityState> ? EntityState :
                                  T extends PlayerClientEntitySyncerArgs<infer EntityState, unknown> ? EntityState : never;

type MessageTypeMap<EntityState> = {
  [handshakeMessageKind]: HandshakeInfo,
  [EntityMessageKind.State]: StateMessage<EntityState>,
};

function splitConnection<EntityState extends NumericObject>(connection: StateMessageAndHandshakeRecipBuffer<EntityState>) {
  const messageCategorizer: MessageCategorizer<MessageTypeMap<EntityState>> = {
    availableCategories: { [handshakeMessageKind]: '', [EntityMessageKind.State]: '' },
    assigner: MessageCategoryAssigner.byStringProperty('kind'),
  };

  const split = RecipientMessageBuffer.split(connection, messageCategorizer);

  return {
    handshakeBuffer: split[handshakeMessageKind],
    entityStateBuffer: split[EntityMessageKind.State],
  };
}

export async function makeClientEntitySyncerFromHandshaking<EntityState extends NumericObject>(args:
  WithHandshake<ClientEntitySyncerArgs<EntityState>>): Promise<ClientEntitySyncer<EntityState>> {

  const { handshakeBuffer, entityStateBuffer } = splitConnection(args.connection);

  const handshake = await receiveHandshake(handshakeBuffer, args.handshakeTimeoutMs);

  const syncerArgs: ClientEntitySyncerArgs<EntityState> = Object.assign(Object.assign({}, args), {
    serverEntityUpdateRateHz: handshake.entityUpdateRateHz,
    connection: entityStateBuffer,
  });

  return ClientEntitySyncer.withoutLocalPlayerSupport(syncerArgs);
}

export async function makePlayerClientEntitySyncerFromHandshaking<EntityInput extends NumericObject,
  EntityState extends NumericObject>(args: WithHandshake<PlayerClientEntitySyncerArgs<EntityState, EntityInput>>):
  Promise<PlayerClientEntitySyncer<EntityInput, EntityState>> {

  const { handshakeBuffer, entityStateBuffer } = splitConnection(args.connection);

  const handshake = await receiveHandshake(handshakeBuffer, args.handshakeTimeoutMs);

  const syncerArgs: PlayerClientEntitySyncerArgs<EntityState, EntityInput> = Object.assign(Object.assign({}, args), {
    serverEntityUpdateRateHz: handshake.entityUpdateRateHz,
    connection: entityStateBuffer,
  });

  return ClientEntitySyncer.withLocalPlayerSupport(syncerArgs);

}
