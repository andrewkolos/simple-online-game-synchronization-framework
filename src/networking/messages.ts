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
  /** Identifies this buffer message object as an entity state message. */
  messageKind: EntityMessageKind.State;
  /** Information regarding the entity. */
  entity: {
    /** The ID of the entity this state message is meant to be used to update. */
    id: string;
    /** The kind of the entity, as defined by the entity object on the server. */
    kind: string;
    /** The state of the entity on the server at the time the message was swent. */
    state: PickState<Entity>;
    /** Whether or not this entity is meant to be controlled by the client that received this message. */
    belongsToRecipientClient?: boolean;
  };
  /** The sequence number of the input message last processed on the server before sending this message. */
  lastProcessedInputSequenceNumber: number;
  /** The UTC timestamp at which the server sent the state (UNIX time, in millseconds). */
  timestampMs: number;
}

export function isEntityInputMessage(message: any): message is InputMessage<any> {
  const asInputMessage = message as Partial<InputMessage<never>>;

  return asInputMessage.messageKind != null && asInputMessage.messageKind === EntityMessageKind.Input;
}

export function isEntityStateMessage(message: any): message is StateMessage<any> {
  const asInputMessage = message as Partial<StateMessage<never>>;

  return asInputMessage.messageKind != null && asInputMessage.messageKind === EntityMessageKind.State;
}
