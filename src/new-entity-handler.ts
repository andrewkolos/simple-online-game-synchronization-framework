import dedent from "dedent";
import { AnyEntity, InterpolableEntity, PickInput, PickState, ReckonableEntity, SyncStrategy } from './entity';
import { StateMessage } from './networking';
import { compareDumbObjects } from './util';

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

export type NonLocalEntityResponse<E extends AnyEntity> = InterpolableEntityResponse<E> | ReckonableEntityResponse<E> | RawEntityResponse<E>;

export interface NewEntityHandler<E extends AnyEntity> {
  createLocalEntityFromStateMessage(stateMessage: StateMessage<E>): E;
  createNonLocalEntityFromStateMessage(stateMessage: StateMessage<E>): NonLocalEntityResponse<E>;
}

/**
 * Decorates an instance of `NewEntityHandler`, adding checks to ensure that the IDs and states of
 * entities created by the hanlder are consistent with the state messages they were created from.
 */
export class CheckedNewEntityHandler<E extends AnyEntity> implements NewEntityHandler<E> {
  
  public constructor(private readonly handler: NewEntityHandler<E>) { }
  
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

  private check(createdEntity: E, creatingStateMessage: StateMessage<E>): void | never {
    if (createdEntity.id !== creatingStateMessage.entity.id) {
      throw Error(dedent`
        The ID of the entity created from the state message, '${createdEntity.id}', is not equivalent to the one
        in the state message it was created from, '${creatingStateMessage.entity.id}.
      `);
    }
    if (!compareDumbObjects(createdEntity.state, creatingStateMessage.entity.state)) {
      throw Error(dedent`
        The state of the entity created from the state message is not identical to state perscribed in the state message.
      `);
    }

  }
}