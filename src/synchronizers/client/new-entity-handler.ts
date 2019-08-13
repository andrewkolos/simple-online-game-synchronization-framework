import { AnyEntity, InterpolableEntity, PickInput, PickState, ReckonableEntity, SyncStrategy } from "../../entity";
import { StateMessage } from "../../networking";
import { compareDumbObjects, singleLineify } from "../../util";

interface InterpolableEntityResponse<E extends AnyEntity> {
  entity: InterpolableEntity<PickInput<E>, PickState<E>>;
  syncStrategy: SyncStrategy.Interpolation;
}

interface ReckonableEntityResponse<E extends AnyEntity> {
  entity: ReckonableEntity<PickInput<E>, PickState<E>>;
  syncStrategy: SyncStrategy.DeadReckoning;
}

interface RawEntityResponse<E extends AnyEntity> {
  entity: E;
  syncStrategy: SyncStrategy.Raw;
}

export type NonLocalEntityResponse<E extends AnyEntity> =
  InterpolableEntityResponse<E> | ReckonableEntityResponse<E> | RawEntityResponse<E>;

/**
 * Creates representations of entities on a server for a client from state messages given by the server.
 * Also tells the client how to synchronize entities not controlled by the local player interacting with the client.
 * @template E The type of entity/entities this handler can create representations of.
 */
export interface NewEntityHandler<E extends AnyEntity> {
  /**
   * Creates an entity that is to be controlled by the client. That is, the client will send inputs to the server
   * to control this entity.
   * @param stateMessage The state message containing information about the entity.
   * @returns A local represenation of the entity on the server.
   */
  createLocalEntityFromStateMessage(stateMessage: StateMessage<E>): E;
  /**
   * Creates an entity that is not to be controlled by the client while specifying which synchronization technique
   * to use to smooth out synchronization of the entity.
   * @param stateMessage The state message containing information about the entity.
   * @returns A local represenation of the entity on the server with a strategy specifying how to synchronize it.
   */
  createNonLocalEntityFromStateMessage(stateMessage: StateMessage<E>): NonLocalEntityResponse<E>;
}

/**
 * Decorates an instance of `NewEntityHandler`, adding checks to ensure that the IDs and states of
 * entities created by the hanlder are consistent with the state messages they were created from.
 */
export class CheckedNewEntityHandler<E extends AnyEntity> implements NewEntityHandler<E> {

  public constructor(private readonly handler: NewEntityHandler<E>) { }

  /** @inheritdoc */
  public createLocalEntityFromStateMessage(stateMessage: StateMessage<E>): E {
    const entity = this.handler.createLocalEntityFromStateMessage(stateMessage);
    this.check(entity, stateMessage);

    return entity;
  }

  public createNonLocalEntityFromStateMessage(stateMessage: StateMessage<E>): NonLocalEntityResponse<E> {
    const response = this.handler.createNonLocalEntityFromStateMessage(stateMessage);
    this.check(response.entity as E, stateMessage);

    return response;
  }

  /** @inheritdoc */
  private check(createdEntity: E, creatingStateMessage: StateMessage<E>): void | never {
    if (createdEntity.id !== creatingStateMessage.entity.id) {
      throw Error(singleLineify`
        The ID of the entity created from the state message, '${createdEntity.id}', is not equivalent to the one
        in the state message it was created from, '${creatingStateMessage.entity.id}.
      `);
    }
    if (!compareDumbObjects(createdEntity.state, creatingStateMessage.entity.state)) {
      throw Error(singleLineify`
        The state of the entity created from the state message is not
        identical to state perscribed in the state message.
      `);
    }

  }
}
