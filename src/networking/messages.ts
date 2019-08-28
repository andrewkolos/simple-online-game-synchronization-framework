export const enum EntityMessageKind {
  Input = 'entityInput',
  State = 'entityState',
}

export interface BufferMessage {
  messageKind: string;
}

export interface InputMessage<T> extends BufferMessage {
  messageKind: EntityMessageKind.Input;
  input: T;
  inputSequenceNumber: number;
  entityId: string;
}

export type StateMessage<T> = StateMessageWithoutSyncInfo<T> | StateMessageWithSyncInfo<T>;

type StateMessageWithoutSyncInfo<T> = BufferMessage & {
  /** Identifies this buffer message object as an entity state message. */
  messageKind: EntityMessageKind.State;
  /** Information regarding the entity. */
  entity: {
    /** The ID of the entity this state message is meant to be used to update. */
    id: string;
    /** The state of the entity on the server at the time the message was swent. */
    state: T;
  };
  /** Indicates that the entity is to be controlled by the client receiving this state message. */
  entityBelongsToRecipientClient?: boolean;
  /** The UTC timestamp at which the server sent the state (UNIX time, in millseconds). */
  sentAt: number;
};

export type StateMessageWithSyncInfo<T> = StateMessageWithoutSyncInfo<T>  & {
  /** Indicates that the entity is to be controlled by the client receiving this state message. */
  entityBelongsToRecipientClient: true;
  /** The sequence number of the input message last processed on the server before sending this message. */
  lastProcessedInputSequenceNumber: number;
};

export function isEntityInputMessage(message: any): message is InputMessage<unknown> {
  const asInputMessage = message as Partial<InputMessage<never>>;

  return asInputMessage.messageKind != null && asInputMessage.messageKind === EntityMessageKind.Input;
}

export function isEntityStateMessage(message: any): message is StateMessage<unknown> {
  const asInputMessage = message as Partial<StateMessage<never>>;

  return asInputMessage.messageKind != null && asInputMessage.messageKind === EntityMessageKind.State;
}
