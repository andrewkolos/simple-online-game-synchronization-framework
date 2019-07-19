import { AnyEntity, PickInput, PickState } from 'src/entity';

export const enum EntityMessageKind {
  Input = "entityInput",
  State = "entityState",
}

export interface BufferMessage {
  messageKind: string;
}

export interface InputMessage<Entity extends AnyEntity> extends BufferMessage {
  messageKind: EntityMessageKind.Input;
  entityId: string;
  input: PickInput<Entity>;
  inputSequenceNumber: number;
}

export interface StateMessage<Entity extends AnyEntity> extends BufferMessage {
  messageKind: EntityMessageKind.State;
  entity: {
    id: string;
    kind: string;
  }
  state: PickState<Entity>;
  lastProcessedInputSequenceNumber: number;
  timestamp: number;
  entityBelongsToRecipientClient?: boolean;
}

export function isEntityInputMessage(message: any): message is InputMessage<any> {
  const asInputMessage = message as Partial<InputMessage<never>>;

  return asInputMessage.messageKind != null && asInputMessage.messageKind === EntityMessageKind.Input;
}

export function isEntityStateMessage(message: any): message is StateMessage<any> {
  const asInputMessage = message as Partial<StateMessage<never>>;

  return asInputMessage.messageKind != null && asInputMessage.messageKind === EntityMessageKind.State;
}
