import { StateMessage, RecipientMessageBuffer, TwoWayMessageBuffer, InputMessage, StateMessageWithSyncInfo, EntityMessageKind } from '../../networking';
import { DefaultMap } from '../../util/default-map';
import { EntityBoundInput } from './entity-bound-input';
import { MultiEntityStateInterpolator } from './state-interpolator';
import { NumericObject } from '../../interpolate-linearly';
import { findLatestMessage } from '../../util/findLatestMessage';
import { InputApplicator } from '../../entity';

type EntityId = string;

interface Entity<State> {
  id: EntityId;
  state: State;
}

export interface LocalPlayerSyncStrategy<Input, State> {
  inputSource: (entities: Array<Entity<State>>) => Array<EntityBoundInput<Input>>;
  inputApplicator: InputApplicator<Input, State>;
}

type PlayerClientSyncerConnectionToServer<Input, State> = TwoWayMessageBuffer<StateMessage<State>, InputMessage<Input>>;

interface ClientEntitySyncerArgsBase {
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

export interface PlayerClientEntitySyncerArgs<Input, State> extends ClientEntitySyncerArgsBase {
  connection: PlayerClientSyncerConnectionToServer<Input, State>;
  localPlayerSyncStrategy: LocalPlayerSyncStrategy<Input, State>;
}

interface SortedStateMessages<State> {
  otherEntities: Array<StateMessage<State>>;
  localEntities: Array<StateMessageWithSyncInfo<State>>;
}

type SequencedEntityBoundInput<I> = Omit<InputMessage<I>, 'messageKind'>;

export class PlayerClientEntitySyncer<State extends NumericObject, Input> {

  private readonly connection: PlayerClientSyncerConnectionToServer<Input, State>;

  private readonly interpolator: MultiEntityStateInterpolator<State>;
  private readonly playerSyncStrategy: LocalPlayerSyncStrategy<Input, State>;

  private currentInputSequenceNumber = 0;
  private pendingInputs: Array<SequencedEntityBoundInput<Input>> = [];

  public constructor(args: PlayerClientEntitySyncerArgs<Input, State>) {
    this.connection = args.connection;
    this.interpolator = MultiEntityStateInterpolator.withBasicInterpolationStrategy(args.serverUpdateRateHz);
    this.playerSyncStrategy = args.localPlayerSyncStrategy;
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
    const newInputs: Array<InputMessage<Input>> = this.collectInputs([...latestStateMessages.values()].map((sm) => sm.entity));
    const inputsToApply: Array<SequencedEntityBoundInput<Input>> = [...this.determinePendingInputs(latestStateMessages), ...newInputs];

    const entitiesAfterSync: Map<EntityId, Entity<State>> =
      new Map([...latestStateMessages.entries()].map(([entityId, message]) => [entityId, message.entity]));

    for (const sebInput of inputsToApply) {
      const targetEntityMessage = entitiesAfterSync.get(sebInput.entityId);
      if (targetEntityMessage == null) continue;
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

  private collectInputs(forEntities: Array<Entity<State>>): Array<InputMessage<Input>> {
    const inputs = this.playerSyncStrategy.inputSource(forEntities);
    const asMessages: Array<InputMessage<Input>> = inputs.map((ebs) => {
      return {
        messageKind: EntityMessageKind.Input,
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
