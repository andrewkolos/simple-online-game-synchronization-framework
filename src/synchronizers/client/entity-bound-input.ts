
export interface EntityBoundInput<I> {
  /**
   * The entity that is to react to the input.
   */
  entityId: string;
  input: I;
}
