import { StateMessage, InputMessage, EntityMessageKind, StateMessageWithSyncInfo } from '../../networking';
import { MultiEntityStateInterpolator } from './state-interpolator';
import { NumericObject } from '../../interpolate-linearly';
import { TwoWayMessageBuffer } from '../../networking/message-buffers/two-way-message-buffer';
import { Entity } from '../../entity';
import { EntityTargetedInput } from './entity-targeted-input';
import { InputValidator } from '../server';
import { InputApplicator } from '../server/input-processing';
import { pickLatestMessages } from './pick-latest-messages';

type EntityId = string;

export interface EntityInfo<State> {
  id: EntityId;
  state: State;
  local: boolean;
}

export interface LocalPlayerInputStrategy<Input, State> {
  inputSource: (entities: Array<EntityInfo<State>>) => Array<EntityTargetedInput<Input>>;
  inputValidator: InputValidator<Input, State>;
  inputApplicator: InputApplicator<Input, State>;
}

export type PlayerConnectionToServer<Input, State> = TwoWayMessageBuffer<StateMessage<State>, InputMessage<Input>>;

export interface PlayerClientEntitySyncerArgs<Input, State> {
  connection: PlayerConnectionToServer<Input, State>;
  localPlayerInputStrategy: LocalPlayerInputStrategy<Input, State>;
  serverUpdateRateHz: number;
}

interface SortedStateMessages<State> {
  otherEntities: Array<StateMessage<State>>;
  localEntities: Array<StateMessageWithSyncInfo<State>>;
}

type SequencedEntityBoundInput<I> = Omit<InputMessage<I>, 'messageKind'>;

export class PlayerClientEntitySyncer<Input, State extends NumericObject> {

  private readonly connection: PlayerConnectionToServer<Input, State>;
  private readonly interpolator: MultiEntityStateInterpolator<State>;
  private readonly playerSyncStrategy: LocalPlayerInputStrategy<Input, State>;
  private currentInputSequenceNumber = 0;
  private pendingInputs: Array<SequencedEntityBoundInput<Input>> = [];

  public constructor(args: PlayerClientEntitySyncerArgs<Input, State>) {
    this.connection = args.connection;
    this.interpolator = MultiEntityStateInterpolator.withBasicInterpolationStrategy(args.serverUpdateRateHz);
    this.playerSyncStrategy = args.localPlayerInputStrategy;
  }

  public getNumberOfPendingInputs(): number {
    return this.pendingInputs.length;
  }

  public synchronize(): Array<Entity<State>> {
    const stateMessages = this.connection.receive();

    const { otherEntities, localEntities } = this.sortStateMessages(stateMessages);
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
    const latestStateMessagesById = new Map(pickLatestMessages(stateMessages).map((message) => [message.entity.id, message]));

    const newInputs: Array<InputMessage<Input>> = this.collectInputs([...latestStateMessagesById.values()].map((sm) => ({
      ...sm.entity,
      local: sm.entityBelongsToRecipientClient || true,
    })));

    const inputsToApply: Array<SequencedEntityBoundInput<Input>> =
      [...this.determinePendingInputs(latestStateMessagesById), ...newInputs];

    const entitiesAfterSync: Map<EntityId, Entity<State>> =
      new Map([...latestStateMessagesById.entries()].map(([entityId, message]) => [entityId, message.entity]));

    for (const sebInput of inputsToApply) {
      const targetEntityMessage = entitiesAfterSync.get(sebInput.entityId);
      if (targetEntityMessage == null || !this.playerSyncStrategy.inputValidator(targetEntityMessage, sebInput.input))
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

  private collectInputs(forEntities: Array<EntityInfo<State>>): Array<InputMessage<Input>> {
    const inputs = this.playerSyncStrategy.inputSource(forEntities);
    const asMessages: Array<InputMessage<Input>> = inputs.map((ebs) => {
      return {
        kind: EntityMessageKind.Input,
        entityId: ebs.entityId,
        input: ebs.input,
        inputSequenceNumber: this.currentInputSequenceNumber,
        timestamp: new Date().getTime(),
      };
    });
    this.currentInputSequenceNumber += 1;
    return asMessages;
  }
}
