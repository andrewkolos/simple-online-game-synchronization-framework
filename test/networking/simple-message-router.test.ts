import { RecipientMessageRouter, TwoWayMessageBuffer, arrayify } from '../../src';

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

interface FooBufferMessage {
  kind: 'foo';
}

interface BarBufferMessage {
  kind: 'bar';
}

function makeFooMessage(): FooBufferMessage {
  return {
    kind: 'foo',
  };
}

function makeBarMessage(): BarBufferMessage {
  return {
    kind: 'bar',
  };
}

describe(nameof(RecipientMessageRouter), () => {
  it('generates new buffers from the original filtered by message kind', () => {
    const buffer = makeSelfSendingBuffer<FooBufferMessage | BarBufferMessage>();

    const router = new RecipientMessageRouter(buffer);
    const fooOnlyBuffer = router.getCategorizedBuffer('foo');
    const barOnlyBuffer = router.getCategorizedBuffer('bar');

    buffer.send(makeBarMessage());
    buffer.send(makeFooMessage());

    expect(fooOnlyBuffer.receive()[1].kind).toEqual('foo');
    expect(barOnlyBuffer.receive()[1].kind).toEqual('bar');
  });
});
