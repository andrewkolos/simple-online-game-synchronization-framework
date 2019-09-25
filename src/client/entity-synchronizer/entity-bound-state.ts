export interface EntityBoundState<S> {
  /**
   * The entity that is to react to the input.
   */
  entityId: string;
  state: S;
}
