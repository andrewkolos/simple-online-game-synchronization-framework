import { AnyPlayerEntity, PickState } from '../../entity';
import { StateMessage } from '../../networking';
import { compareDumbObjects, singleLineify } from '../../util';

/**
 * Creates representations of entities on a server for a client from state messages given by the server.
 * Also tells the client how to synchronize entities not controlled by the local player interacting with the client.
 * @template E The type of entity/entities this handler can create representations of.
 */
export interface EntityFactory<E extends AnyPlayerEntity> {
  /**
   * Creates an entity that is to be controlled by the client. That is, the client will send inputs to the server
   * to control this entity.
   * @param stateMessage The state message containing information about the entity.
   * @returns A local represenation of the entity on the server.
   */
  fromStateMessage(stateMessage: StateMessage<PickState<E>>): E;
}

/**
 * Decorates an instance of `NewEntityHandler`, adding checks to ensure that the IDs and states of
 * entities created by the hanlder are consistent with the state messages they were created from.
 */
export class CheckedNewEntityHandler<E extends AnyPlayerEntity> implements EntityFactory<E> {

  public constructor(private readonly handler: EntityFactory<E>) { }

  /** @inheritdoc */
  public fromStateMessage(stateMessage: StateMessage<PickState<E>>): E {
    const entity = this.handler.fromStateMessage(stateMessage);
    this.check(entity, stateMessage);

    return entity;
  }

  /** @inheritdoc */
  private check(createdEntity: E, creatingStateMessage: StateMessage<PickState<E>>): void | never {
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
