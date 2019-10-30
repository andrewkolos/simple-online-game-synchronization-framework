import { RecipientMessageBuffer, TwoWayMessageBuffer, arrayify, MessageCategorizer, MessageTypeMap, MessageCategoryAssigner } from '../../src';

function makeSelfSendingBuffer<T>(): TwoWayMessageBuffer<T, T> {
  const buffer: T[] = [];

  return {
    send: (m: T | T[]) => {
      buffer.push(...arrayify(m));
    },
    receive: () => buffer.splice(0),
    [Symbol.iterator]() {
      return buffer.values();
    },
  };
}

interface FooMessage {
  kind: 'foo';
}

interface BarMessage {
  kind: 'bar';
}

function makeFooMessage(): FooMessage {
  return {
    kind: 'foo',
  };
}

function makeBarMessage(): BarMessage {
  return {
    kind: 'bar',
  };
}

interface TypeMap extends MessageTypeMap<FooMessage | BarMessage> {
  foo: FooMessage;
  bar: BarMessage;
}

function makeSplitBuffers() {
  const buffer = makeSelfSendingBuffer<FooMessage | BarMessage>();
  const categorizer: MessageCategorizer<TypeMap> = {
    availableCategories: { foo: '', bar: '' },
    assigner: MessageCategoryAssigner.byStringProperty('kind'),
  };

  const { foo, bar } = RecipientMessageBuffer.split(buffer, categorizer);

  return {
    buffer,
    foo,
    bar,
  };
}

describe(nameof(RecipientMessageBuffer.split), () => {
  it('splits into buffers that only receive messages of the correct category', () => {

    const { buffer, foo, bar } = makeSplitBuffers();

    buffer.send([makeFooMessage(), makeBarMessage()]);

    expect(foo.receive()).toEqual([{ kind: 'foo' }]);
    expect(bar.receive()).toEqual([{ kind: 'bar' }]);
  });

  it('does not allow calls to receive on the split buffer', () => {
    const { buffer } = makeSplitBuffers();
    expect(() => buffer.receive()).toThrowError(new Error(RecipientMessageBuffer.ATTEMPTED_TO_RECEIVE_ON_SPLIT_ERROR_MESSAGE));
  });

  it('splits into buffers that properly consume messages', () => {
    const { buffer, foo } = makeSplitBuffers();

    buffer.send([makeFooMessage()]);

    expect(foo.receive()).toEqual([{ kind: 'foo' }]);

    expect(foo.receive()).toEqual([]);
  });

  it('splits into buffers that do not consume messages for other categories', () => {
    const { buffer, foo, bar } = makeSplitBuffers();

    buffer.send([makeFooMessage(), makeBarMessage()]);

    expect(foo.receive()).toEqual([{ kind: 'foo' }]);
    buffer.send(makeBarMessage());
    expect(bar.receive()).toEqual([{ kind: 'bar' }, {kind: 'bar'}]);
  });
});
