import MockDate from 'mockdate';
import { TimestampedBuffer, Timestamped } from '../../src/networking/lag-compensation';
import { advanceTime } from './advanceTime';

describe(nameof(TimestampedBuffer), () => {

  afterEach(() => {
    MockDate.reset();
  });

  it('discards states older than the specified record length', () => {
    const history = new TimestampedBuffer<number>(10);

    history.record(1);

    MockDate.set(new Date().getTime() + 20);

    const states = history.getStates();
    expect(states.length).toBe(0);

    MockDate.reset();
  });

  it('can retrieve all states older than a specified time', () => {
    const history = new TimestampedBuffer<number>(100);

    insertAt(history, 1);
    const timestampOf2 = insertAt(history, 2, 10);
    insertAt(history, 3, 10);
    insertAt(history, 4, 10);

    const threeAndFour: Array<Timestamped<number>> = [
      {
        value: 3,
        timestamp: new Date().getTime() - 10,
      },
      {
        value: 4,
        timestamp: new Date().getTime() - 0,
      }
    ]

    expect(history.after(timestampOf2)).toEqual(threeAndFour);
  });

  it('can retrieve all states newer than a specified time', () => {
    const history = new TimestampedBuffer<number>(100);

    insertAt(history, 1);
    insertAt(history, 2, 10);
    const timestampOf3 = insertAt(history, 3, 10);
    insertAt(history, 4, 10);

    const oneAndTwo: Array<Timestamped<number>> = [
      {
        value: 1,
        timestamp: new Date().getTime() - 30,
      },
      {
        value: 2,
        timestamp: new Date().getTime() - 20,
      }
    ]

    expect(history.before(timestampOf3)).toEqual(oneAndTwo);
  });

  it('can retrieve all states within a time range', () => {
    const history = new TimestampedBuffer<number>(100);

    for (let i = 1; i <= 5; i++) {
      history.record(i);
      if (i < 5) advanceTime(10);
    }

    const now = new Date().getTime();

    const twoThroughFour: Array<Timestamped<number>> = [
      {
        value: 2,
        timestamp: now - 30,
      },
      {
        value: 3,
        timestamp: now - 20,
      },
      {
        value: 4,
        timestamp: now - 10,
      },
    ];

    expect(history.slice(now - 30, now)).toEqual(twoThroughFour);
  });

  it('a recording will overwrite an existing one that has the same timestamp', () => {
    const history = new TimestampedBuffer<number>(100);

    const now = new Date().getTime();
    history.record(1);
    MockDate.set(now);
    history.record(2);

    expect(history.getStates()[0].value).toEqual(2);
    expect(history.getStates()[0].timestamp).toEqual(now);
  });
});

function insertAt<T>(history: TimestampedBuffer<T>, item: T, fastForwardMs: number = 0): number {
  const time = new Date().getTime() + fastForwardMs;
  MockDate.set(time);
  history.record(item);
  return time;
}
