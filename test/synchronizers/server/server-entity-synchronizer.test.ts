import { ServerEntitySyncer, EntityMessageKind } from '../../../src';

describe(nameof(ServerEntitySyncer), () => {
  it('synchronized event should give deep copies of entity states', () => {
    const syncer = new ServerEntitySyncer<number, { foo: number }>({
      clientIdAssigner: (() => { let i = 0; return () => String(i++); })(),
      connectionHandler: () => { },
      inputApplicator: (currentState: { foo: number }, input: number) => ({ foo: currentState.foo + input }),
      inputValidator: () => true,
    });

    let seqNumber = 0;

    const playerClientId = syncer.connectClient({
      receive: () => [{
        entityId: 'a',
        input: 1,
        inputSequenceNumber: seqNumber++,
        messageKind: EntityMessageKind.Input,
      }],
      [Symbol.iterator]() {
        return this.receive().values();
      },
      send: (_messages: any) => { }
    });

    syncer.addPlayerEntity({ id: 'a', state: { foo: 0 } }, playerClientId);

    const entities = syncer.synchronize();
    const expected = [
      {
        id: 'a',
        state: {
          foo: 1,
        },
      },
    ];
    expect(entities).toEqual(expected);
    const entities2 = syncer.synchronize();
    expected[0].state.foo += 1;
    expect(entities2).toEqual(expected);
  });
});
