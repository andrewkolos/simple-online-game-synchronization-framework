import { StateMessage, InputMessage, StateMessageWithSyncInfo, EntityMessageKind, HandshakeData } from '../../networking';
import { DefaultMap } from '../../util/default-map';
import { MultiEntityStateInterpolator } from './state-interpolator';
import { NumericObject } from '../../interpolate-linearly';
import { findLatestMessage } from '../../util/findLatestMessage';
import { TwoWayMessageBuffer } from '../../networking/message-buffer';
import { Entity, InputApplicator } from '../../entity';
import { EntityTargetedInput } from './entity-targeted-input';
import { makePlayerClientEntitySyncerFromHandshaking } from './handshaking-factory-functions';

type EntityId = string;

export interface EntityInfo<State> {
  id: EntityId;
  state: State;
  local: boolean;
}

export interface LocalPlayerInputStrategy<Input, State> {
  inputSource: (entities: Array<EntityInfo<State>>) => Array<EntityTargetedInput<Input>>;
  inputApplicator: InputApplicator<Input, State>;
}

export type PlayerClientSyncerConnectionToServer<Input, State> = TwoWayMessageBuffer<StateMessage<State>, InputMessage<Input>>;

export interface PlayerClientEntitySyncerArgs<Input, State> {
  connection: TwoWayMessageBuffer<StateMessage<State> | HandshakeData, InputMessage<Input>>;
  localPlayerInputStrategy: LocalPlayerInputStrategy<Input, State>;
  handshakeTimeoutMs?: number;
}

export interface PlayerClientEntitySyncerArgsWithServerInfo<Input, State> {
  connection: PlayerClientSyncerConnectionToServer<Input, State>;
  localPlayerInputStrategy: LocalPlayerInputStrategy<Input, State>;
  serverUpdateRateHz: number;
}

interface SortedStateMessages<State> {
  otherEntities: Array<StateMessage<State>>;
  localEntities: Array<StateMessageWithSyncInfo<State>>;
}

type SequencedEntityBoundInput<I> = Omit<InputMessage<I>, 'messageKind'>;

export interface PlayerClientEntitySyncerPreHandshake<Input, State extends NumericObject> {
  handshake(): Promise<PlayerClientEntitySyncer<Input, State>>;
}

export class PlayerClientEntitySyncer<Input, State extends NumericObject> {

  public static create<Input, State extends NumericObject>(args: PlayerClientEntitySyncerArgs<Input, State>):
    PlayerClientEntitySyncerPreHandshake<Input, State> {

    return {
      handshake: async () => makePlayerClientEntitySyncerFromHandshaking(args),
    };
  }

  public static createWithServerInfo<Input, State extends NumericObject>(args: PlayerClientEntitySyncerArgsWithServerInfo<Input, State>) {
    return new PlayerClientEntitySyncer(args);
  }

  private readonly connection: PlayerClientSyncerConnectionToServer<Input, State>;
  private readonly interpolator: MultiEntityStateInterpolator<State>;
  private readonly playerSyncStrategy: LocalPlayerInputStrategy<Input, State>;
  private currentInputSequenceNumber = 0;
  private pendingInputs: Array<SequencedEntityBoundInput<Input>> = [];

  private constructor(args: PlayerClientEntitySyncerArgsWithServerInfo<Input, State>) {
    this.connection = args.connection;
    this.interpolator = MultiEntityStateInterpolator.withBasicInterpolationStrategy(args.serverUpdateRateHz);
    this.playerSyncStrategy = args.localPlayerInputStrategy;
  }

  public getNumberOfPendingInputs(): number {
    return this.pendingInputs.length;
  }

  public synchronize(): Array<Entity<State>> {
    const { otherEntities, localEntities } = this.sortStateMessages(this.connection.receive());
    const updatedStatesOfNonLocalEntities = this.synchronizeNonLocalEntities(otherEntities);
    const updatedStatesOfLocalEntities = this.synchronizeLocalPlayerEntities(localEntities);
    return [...updatedStatesOfNonLocalEntities, ...updatedStatesOfLocalEntities];
  }

  private sortStateMessages(messages: Array<StateMessage<State>>): SortedStateMessages<State> {
    const otherEntities: Array<StateMessage<State>> = [];
    const localEntities: Array<StateMessageWithSyncInfo<State>> = [];
    for (const message of messages) {
      const bufferToWhichThisMessageBelongs = message.entityBelongsToRecipientClient ? localEntities : otherEntities;
      bufferToWhichThisMessageBelongs.push(message);
    }
    return {
      otherEntities,
      localEntities,
    };
  }

  private synchronizeNonLocalEntities(stateMessages: Array<StateMessage<State>>): Array<Entity<State>> {
    const asEntities: Array<Entity<State>> = stateMessages.map((sm: StateMessage<State>) => ({
      id: sm.entity.id,
      state: sm.entity.state,
    }));
    return this.interpolator.interpolate(asEntities);
  }

  private synchronizeLocalPlayerEntities(stateMessages: Array<StateMessageWithSyncInfo<State>>): Array<Entity<State>> {
    const latestStateMessages = this.pickLatestMessagesIndexedByEntityId(stateMessages);
    const newInputs: Array<InputMessage<Input>> = this.collectInputs([...latestStateMessages.values()].map((sm) => ({
      ...sm.entity,
      local: sm.entityBelongsToRecipientClient,
    })));
    const inputsToApply: Array<SequencedEntityBoundInput<Input>> = [...this.determinePendingInputs(latestStateMessages), ...newInputs];

    const entitiesAfterSync: Map<EntityId, Entity<State>> =
      new Map([...latestStateMessages.entries()].map(([entityId, message]) => [entityId, message.entity]));

    for (const sebInput of inputsToApply) {
      const targetEntityMessage = entitiesAfterSync.get(sebInput.entityId);
      if (targetEntityMessage == null)
        continue;
      const state = targetEntityMessage.state;
      const stateAfterInput = this.playerSyncStrategy.inputApplicator(state, sebInput.input);
      entitiesAfterSync.set(targetEntityMessage.id, ({ id: targetEntityMessage.id, state: stateAfterInput }));
    }

    this.pendingInputs = inputsToApply;
    this.connection.send(newInputs);
    return [...entitiesAfterSync.values()];
  }

  private determinePendingInputs(latestStateMessages: Map<EntityId, StateMessageWithSyncInfo<State>>) {
    return this.pendingInputs.filter((sebInput: SequencedEntityBoundInput<Input>) => {
      const latestStateMessageForEntity = latestStateMessages.get(sebInput.entityId);
      if (latestStateMessageForEntity == null)
        return false;
      return latestStateMessageForEntity.lastProcessedInputSequenceNumber < sebInput.inputSequenceNumber;
    });
  }

  private pickLatestMessagesIndexedByEntityId<M extends StateMessage<State>>(stateMessages: M[]): Map<EntityId, M> {
    const grouped = groupByEntityId(stateMessages, (sm) => sm.entity.id);
    const latest = grouped.map((messages) => findLatestMessage(messages));
    return new Map(latest.map((message: M) => [message.entity.id, message]));
  }

  private collectInputs(forEntities: Array<EntityInfo<State>>): Array<InputMessage<Input>> {
    const inputs = this.playerSyncStrategy.inputSource(forEntities);
    const asMessages: Array<InputMessage<Input>> = inputs.map((ebs) => {
      return {
        kind: EntityMessageKind.Input,
        entityId: ebs.entityId,
        input: ebs.input,
        inputSequenceNumber: this.currentInputSequenceNumber,
      };
    });
    this.currentInputSequenceNumber += 1;
    return asMessages;
  }
}

function groupByEntityId<T>(collection: Iterable<T>, entityIdPicker: (item: T) => EntityId): T[][] {
  return Array.from(indexByEntityId(collection, entityIdPicker).values());
}

function indexByEntityId<T>(collection: Iterable<T>, entityIdPicker: (item: T) => EntityId): Map<EntityId, T[]> {
  const map = new DefaultMap<EntityId, T[]>(() => []);
  for (const item of collection) {
    map.get(entityIdPicker(item)).push(item);
  }
  return map;
}
