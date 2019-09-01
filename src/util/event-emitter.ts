type Arguments<T> = [T] extends [(...args: infer U) => any]
  ? U
  : [T] extends [void] ? [] : [T];

/**
 * Resembles the NodeJS EventEmitter class. This custom event emitter
 * features specifying types for event names and their callbacks.
 */
export class TypedEventEmitter<Events> {
  private handlers: any[] = [];

  public on<E extends keyof Events>(type: E, fn: Events[E]) {
    this.handlers.push([type, fn]);
  }

  public off<E extends keyof Events>(type: E, fn: Events[E]) {
    this.handlers = this.handlers.filter((handler) =>
      !(handler[0] === type && (fn != null ? true : handler[1] == fn)),
    );
  }

  public emit<E extends keyof Events>(type: E, ...args: Arguments<Events[E]>) {
    this.handlers.filter((handler) => handler[0] === type).forEach((handler) => {
      handler[1](...args);
    });
  }

  public clear() {
    this.handlers = [];
  }
}
