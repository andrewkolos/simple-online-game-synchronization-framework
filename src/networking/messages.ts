export const enum EntityMessageKind {
  Input = "entityInput",
  State = "entityState",
}

export interface BufferMessage {
  kind: string;
}

export interface InputMessage extends BufferMessage {
  kind: EntityMessageKind.Input;
  entityId: string;
  input: any;
  inputSequenceNumber: number;
}

export interface StateMessage extends BufferMessage {
  kind: EntityMessageKind.State;
  entityId: string;
  state: any;
  lastProcessedInputSequenceNumber: number;
  entityBelongsToRecipientClient?: boolean;
}

export function isEntityInputMessage(message: any): message is InputMessage {
  const asInputMessage = message as Partial<InputMessage>;

  return asInputMessage.kind != null && asInputMessage.kind === EntityMessageKind.Input;
}

export function isEntityStateMessage(message: any): message is StateMessage {
  const asInputMessage = message as Partial<StateMessage>;

  return asInputMessage.kind != null && asInputMessage.kind === EntityMessageKind.State;
}
