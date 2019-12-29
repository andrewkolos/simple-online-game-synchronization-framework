import { StateMessage, StateMessageWithSyncInfo, EntityMessageKind, InputMessage } from '../../networking';
import { EntityBoundState } from '../client';
import { ConnectionToPlayerClient } from './connection-to-player-client';
import { EntityId } from '../../entity';
import { InputValidator } from './input-processing';
import { ReadonlyEntityCollection } from '../entity-collection';

export interface ClientArgs<Input, State> {
  id: string;
  connection: ConnectionToPlayerClient<Input, State>;
  inputValidator: InputValidator<Input, State>;
}

export class Client<Input, State> {

  public readonly id: string;

  public get seqNumberOfLastProcessedInput() {
    return this._seqNumberOfLastProcessedInput;
  }

  private readonly connection: ConnectionToPlayerClient<Input, State>;
  private readonly inputValidator: InputValidator<Input, State>;

  private _seqNumberOfLastProcessedInput: number = 0;
  private ownedEntityIds = new Set<EntityId>();

  public constructor(args: ClientArgs<Input, State>) {
    this.connection = args.connection;
    this.inputValidator = args.inputValidator;
    this.id = args.id;
   }

  public assignOwnershipOfEntity(entityId: EntityId) {
    this.ownedEntityIds.add(entityId);
  }

  public hasOwnershipOfEntity(entityId: EntityId): boolean {
    return this.ownedEntityIds.has(entityId);
  }

  public revokeOwnershipOfEntity(entityId: EntityId): boolean {
    return this.ownedEntityIds.delete(entityId);
  }

  public sendStates(states: Array<EntityBoundState<State>>) {
    const messages: Array<StateMessage<State>> = states.map((s) => {
      const messageWithoutSyncInfo: StateMessage<State> = {
        kind: EntityMessageKind.State,
        entity: {
          id: s.entityId,
          state: s.state,
        },
        sentAt: new Date().getTime(),
      };

      const ownEntity = this.ownedEntityIds.has(s.entityId);
      if (ownEntity) {
        const msg: StateMessageWithSyncInfo<State> = {
          ...messageWithoutSyncInfo,
          entityBelongsToRecipientClient: true,
          lastProcessedInputSequenceNumber: this._seqNumberOfLastProcessedInput,
        };
        return msg;
      } else {
        return messageWithoutSyncInfo;
      }
    });

    this.connection.send(messages);
  }

  public retrieveInputs(currentEntityStates: ReadonlyEntityCollection<State>): Array<InputMessage<Input>> {
    return this.connection.receive().filter((im) => {
      this._seqNumberOfLastProcessedInput = Math.max(this._seqNumberOfLastProcessedInput, im.inputSequenceNumber);
      const entity = currentEntityStates.get(im.entityId);
      if (entity == null) return false;
      return this.ownedEntityIds.has(im.entityId) && this.inputValidator(entity, im.input);
    });
  }
}