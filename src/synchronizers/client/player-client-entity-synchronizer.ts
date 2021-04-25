import { Entity, InputApplicator } from '../../entity';
import { NumericObject } from '../../interpolate-linearly';
import { EntityMessageKind, InputMessage, StateMessage, StateMessageWithSyncInfo } from '../../networking';
import { TwoWayMessageBuffer } from '../../networking/message-buffer';
import { cloneDumbObject } from '../../util';
import { EntityCollection } from '../entity-collection';
import { InputValidator } from '../server';
import { EntityTargetedInput } from './entity-targeted-input';
import { MultiEntityStateInterpolator } from './state-interpolator';

type EntityId = string;

export interface EntityInfo<State> {
  id: EntityId;
  state: State;
  local: boolean;
}

export type InputSource<Input, State> = (entities: Array<EntityInfo<State>>) => Array<EntityTargetedInput<Input>>;

export interface LocalPlayerInputStrategy<Input, State> {
  inputSource: InputSource<Input, State>;
  inputValidator: InputValidator<Input, State>;
  inputApplicator: InputApplicator<Input, State>;
}

export type PlayerClientSyncerConnectionToServer<Input, State> = TwoWayMessageBuffer<StateMessage<State>, InputMessage<Input>>;

export interface PlayerClientEntitySyncerArgs<Input, State> {
  connection: TwoWayMessageBuffer<StateMessage<State>, InputMessage<Input>>;
  localPlayerInputStrategy: LocalPlayerInputStrategy<Input, State>;
  serverUpdateRateHz: number;
}

interface SortedStateMessages<State> {
  otherEntities: Array<StateMessage<State>>;
  localEntities: Array<StateMessageWithSyncInfo<State>>;
}

type SequencedEntityBoundInput<I> = Omit<InputMessage<I>, 'messageKind'>;

export class PlayerClientEntitySyncer<Input, State extends NumericObject> {

  private readonly connection: PlayerClientSyncerConnectionToServer<Input, State>;
  private readonly interpolator: MultiEntityStateInterpolator<State>;
  private readonly playerSyncStrategy: LocalPlayerInputStrategy<Input, State>;
  private currentInputSequenceNumber = 0;
  private pendingInputs = new Map<string, Array<SequencedEntityBoundInput<Input>>>();
  private readonly localEntities = new EntityCollection<State>();

  public constructor(args: PlayerClientEntitySyncerArgs<Input, State>) {
    this.connection = args.connection;
    this.interpolator = MultiEntityStateInterpolator.withBasicInterpolationStrategy(args.serverUpdateRateHz);
    this.playerSyncStrategy = args.localPlayerInputStrategy;
  }

  public getNumberOfPendingInputs(): number {
    return [...this.pendingInputs.values()].reduce((sum, currEntitiesPendingInputs) => sum + currEntitiesPendingInputs.length, 0);
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

  private synchronizeNonLocalEntities(stateMessages: Array<StateMessage<State>>): ReadonlyArray<Entity<State>> {
    const asEntities: Array<Entity<State>> = stateMessages.map((sm: StateMessage<State>) => ({
      id: sm.entity.id,
      state: sm.entity.state,
    }));
    return this.interpolator.interpolate(asEntities);
  }

  private synchronizeLocalPlayerEntities(stateMessages: Array<StateMessageWithSyncInfo<State>>): ReadonlyArray<Entity<State>> {
    // Apply updates from server, reapply pending inputs.
    stateMessages.forEach((sm) => {
      const { entity } = cloneDumbObject(sm);
      const pendingInputs = this.pendingInputs.get(sm.entity.id) ?? [];

      let j = 0;
      while (j < pendingInputs.length) {
        const input = pendingInputs[j];
        if (input.inputSequenceNumber <= sm.lastProcessedInputSequenceNumber || !this.playerSyncStrategy.inputValidator(entity, input.input)) {
          pendingInputs.splice(j, 1); // Drop this input.
        } else {
          entity.state = this.playerSyncStrategy.inputApplicator(entity, input.input);
          j++;
        }
      }
      this.localEntities.add(entity);
    });

    // Collect new inputs, send them to the server, and store them as pending.
    const localEntityInfos = this.localEntities.asArray().map((e) => ({ ...e, local: true }));
    const nonLocalEntityInfos = this.interpolator.interpolate([]).map((e => ({ ...e, local: false })));
    const newInputs = this.collectInputs([...localEntityInfos, ...nonLocalEntityInfos]);
    newInputs.forEach((ni) => {
      this.connection.send(newInputs);

      const entity = this.localEntities.getAsEntity(ni.entityId);
      if (entity == null) return;
      this.localEntities.set(ni.entityId, this.playerSyncStrategy.inputApplicator(entity, ni.input));
      const alreadyPendingInputs = this.pendingInputs.get(ni.entityId) ?? [];
      alreadyPendingInputs.push(ni);
      this.pendingInputs.set(ni.entityId, alreadyPendingInputs);
    });

    return this.localEntities.asArray();
  }

  private collectInputs(forEntities: Array<EntityInfo<State>>): Array<InputMessage<Input>> {
    const inputs = this.playerSyncStrategy.inputSource(forEntities);
    const asMessages: Array<InputMessage<Input>> = inputs.map((ebs) => {
      return {
        timestamp: new Date().getTime(),
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
