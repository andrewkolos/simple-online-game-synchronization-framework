import { EntityTypeMap, PickInputType, PickStateType } from '../syncable-entity';

export const enum EntityMessageKind {
  Input = "entityInput",
  State = "entityState",
}

export interface BufferMessage {
  kind: string;
}

export interface InputMessage<T> extends BufferMessage {
  kind: EntityMessageKind.Input;
  entityId: string;
  input: T;
  inputSequenceNumber: number;
}

export interface StateMessage<T> extends BufferMessage {
  kind: EntityMessageKind.State;
  entityId: string;
  state: T;
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

export type InputMessageFromEntityMap<M extends EntityTypeMap> = InputMessage<PickInputType<M>>;
export type StateMessageFromEntityMap<M extends EntityTypeMap> = StateMessage<PickStateType<M>>