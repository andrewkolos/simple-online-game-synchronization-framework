import { ClientEntitySyncerArgs, ClientEntitySyncer, ClientEntitySyncerArgsWithServerInfo } from './client-entity-synchronizer';
import { RecipientMessageBuffer } from '../../networking/message-buffer';
import { StateMessage, HandshakeData, EntityMessageKind, InputMessage } from '../../networking';
import { MessageCategorizer, MessageCategoryAssigner } from '../../networking/message-categorizer';
import { handshakeMessageKind } from '../../handshaking/message-types';
import { receiveHandshake } from '../../handshaking/receive-handshake';
import { NumericObject } from '../../interpolate-linearly';
import { PlayerClientEntitySyncer, PlayerClientEntitySyncerArgs, PlayerClientEntitySyncerArgsWithServerInfo } from './player-client-entity-synchronizer';

type StateMessageAndHandshakeRecipBuffer<EntityState> = RecipientMessageBuffer<StateMessage<EntityState> | HandshakeData>;

type MessageTypeMap<EntityState> = {
  [handshakeMessageKind]: HandshakeData,
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
  ClientEntitySyncerArgs<EntityState>): Promise<ClientEntitySyncer<EntityState>> {

  const { handshakeBuffer, entityStateBuffer } = splitConnection(args.connection);

  const handshake = await receiveHandshake(handshakeBuffer, args.handshakeTimeoutMs);

  const syncerArgs: ClientEntitySyncerArgsWithServerInfo<EntityState> = {
    connection: entityStateBuffer,
    serverUpdateRateHz: handshake.entityUpdateRateHz,
  };

  return ClientEntitySyncer.createWithServerInfo(syncerArgs);
}

export async function makePlayerClientEntitySyncerFromHandshaking<EntityInput,
  EntityState extends NumericObject>(args: PlayerClientEntitySyncerArgs<EntityInput, EntityState>):
  Promise<PlayerClientEntitySyncer<EntityInput, EntityState>> {

  const { handshakeBuffer, entityStateBuffer } = splitConnection(args.connection);

  const handshake = await receiveHandshake(handshakeBuffer, args.handshakeTimeoutMs);

  const syncerArgs: PlayerClientEntitySyncerArgsWithServerInfo<EntityInput, EntityState> = {
    connection: {
      receive() { return entityStateBuffer.receive(); },
      [Symbol.iterator]: entityStateBuffer[Symbol.iterator],
      send: (messages: InputMessage<EntityInput> | Array<InputMessage<EntityInput>>) => args.connection.send(messages),
    },
    serverUpdateRateHz: handshake.entityUpdateRateHz,
    localPlayerInputStrategy: args.localPlayerInputStrategy,
  }

  return PlayerClientEntitySyncer.createWithServerInfo(syncerArgs);

}
