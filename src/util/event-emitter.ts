// tslint:disable

type Arguments<T> = [T] extends [(...args: infer U) => any]
  ? U
  : [T] extends [void] ? [] : [T];

/**
 * Resembles the NodeJS EventEmitter class. This custom event emitter
 * features specifying types for event names and their callbacks.
 */
export class TypedEventEmitter<Events> {
  private handlers: Array<any> = [];

  public addEventListener<E extends keyof Events>(type: E, fn: Events[E]) {
    this.handlers.push([type, fn]);
  }

  public removeEventListener<E extends keyof Events>(type: E, fn: Events[E]) {
    this.handlers = this.handlers.filter(handler => 
      !(handler[0] === type && (fn != null ? true: handler[1] == fn))
    )
  }

  public dispatchEvent<E extends keyof Events>(type: E, ...args: Arguments<Events[E]>) {
    this.handlers.filter(handler => handler[0] === type).forEach(handler => {
      handler[1](...args);
    })
  }

  public clearEventListeners() {
    this.handlers = [];
  }

  public on<E extends keyof Events>(type: E, fn: Events[E]) {
    this.addEventListener(type, fn);
  }

  public off<E extends keyof Events>(type: E, fn: Events[E]) {
    this.removeEventListener(type, fn);
  }

  public emit<E extends keyof Events>(type: E, ...args: Arguments<Events[E]>) {
    this.dispatchEvent(type, ...args);
  }

  public clear() {
    this.clearEventListeners();
  }
}