/**
 * A network that can be used by a client to communicate to a server or vis-a-versa.
 */
export interface TwoWayMessageBuffer<R, S> extends RecipientMessageBuffer<R>, SenderMessageBuffer<S> {
}

export interface RecipientMessageBuffer<T> {
  [Symbol.iterator](): IterableIterator<T>;
  receive(): T[];
}

export interface SenderMessageBuffer<T> {
  send(messages: T | T[]): void;
}

export function isTwoWayBuffer<R, S>(buffer: RecipientMessageBuffer<R>): buffer is TwoWayMessageBuffer<R, S> {
  return (buffer as Partial<TwoWayMessageBuffer<R, S>>).send != null;
}

export interface FilteringResult<T> {
  passesFilterBuffer: RecipientMessageBuffer<T>;
  caughtByFilterBuffer: RecipientMessageBuffer<T>;
}

export function filterMessageBuffer<R>(buffer: RecipientMessageBuffer<R>, filter: (message: R) => boolean) {
  const passedFilter: R[] = [];
  const caughtByFilter: R[] = [];

  const categorize = () => {
    const messages = buffer.receive();
    for (const message of messages) {
      if (filter(message)) {
        passedFilter.push(message);
      } else {
        caughtByFilter.push(message);
      }
    }
  };

  const passesFilterBuffer: RecipientMessageBuffer<R> = {
    receive: () => {
      categorize();
      return passedFilter.splice(0);
    },
    [Symbol.iterator]() {
      return this.receive().values();
    },
  };

  const caughtByFilterBuffer: RecipientMessageBuffer<R> = {
    receive: () => {
      categorize();
      return caughtByFilter.splice(0);
    },
    [Symbol.iterator]() {
      return this.receive().values();
    },
  };

  return {
    passesFilterBuffer,
    caughtByFilterBuffer,
  };
}
