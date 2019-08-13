import { AnyEntity, PickInput } from "../../entity";

export interface EntityBoundInput<E extends AnyEntity> {
  /**
   * The entity that is to react to the input.
   */
  entityId: string;
  input: PickInput<E>;
}
