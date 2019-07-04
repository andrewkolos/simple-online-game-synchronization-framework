import { AnySyncableEntity, PickState, PickInput } from '../syncable-entity';

export const enum EntityMessageKind {
  Input = "entityInput",
  State = "entityState",
}

export interface BufferMessage {
  kind: string;
}

export interface InputMessage<Entity extends AnySyncableEntity> extends BufferMessage {
  kind: EntityMessageKind.Input;
  entityId: string;
  input: PickInput<Entity>;
  inputSequenceNumber: number;
}

export interface StateMessage<Entity extends AnySyncableEntity> extends BufferMessage {
  kind: EntityMessageKind.State;
  entityId: string;
  state: PickState<Entity>;
  lastProcessedInputSequenceNumber: number;
  entityBelongsToRecipientClient?: boolean;
}

export function isEntityInputMessage(message: any): message is InputMessage<any> {
  const asInputMessage = message as Partial<InputMessage<never>>;

  return asInputMessage.kind != null && asInputMessage.kind === EntityMessageKind.Input;
}

export function isEntityStateMessage(message: any): message is StateMessage<any> {
  const asInputMessage = message as Partial<StateMessage<never>>;

  return asInputMessage.kind != null && asInputMessage.kind === EntityMessageKind.State;
}
