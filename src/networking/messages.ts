export interface BufferMessage {
  messageKind: string;
}

export interface InputMessage extends BufferMessage {
  messageKind: "entityInput";
  entityId: string;
  input: any;
  inputSequenceNumber: number;
}

export interface StateMessage extends BufferMessage {
  messageKind: "entityState";
  entityId: string;
  state: any;
  lastProcessedInputSequenceNumber: number;
  entityBelongsToRecipientClient?: boolean;
}

export function isEntityInputMessage(message: any): message is InputMessage {
  const asInputMessage = message as Partial<InputMessage>;

  return asInputMessage.messageKind != null && asInputMessage.messageKind === "entityInput";
}

export function isEntityStateMessage(message: any): message is StateMessage {
  const asInputMessage = message as Partial<StateMessage>;

  return asInputMessage.messageKind != null && asInputMessage.messageKind === "entityState";
}