import { StateHistory, Timestamp, Timestamped } from 'src/';
import MockDate from "mockdate";

describe(nameof(StateHistory), () => {

  afterEach(() => {
    MockDate.reset();
  });

  it("discards states older than the specified record length", () => {
    const history = new StateHistory<number>(10);

    history.record(1);

    MockDate.set(new Date().getTime() + 20);

    const states = history.getStates();
    expect(states.length).toBe(0);

    MockDate.reset();
  });

  it("can retrieve all states older than a specified time", () => {
    const history = new StateHistory<number>(100);

    insertAt(history, 1);
    const timestampOf2 = insertAt(history, 2, 10);
    insertAt(history, 3, 10);
    insertAt(history, 4, 10);

    const threeAndFour: Timestamped<number>[] = [
      {
        value: 3,
        timestamp: new Timestamp(new Date().getTime() - 10),
      },
      {
        value: 4,
        timestamp: new Timestamp(new Date().getTime() - 0),
      }
    ]

    expect(history.getStatesAfter(new Timestamp(timestampOf2))).toEqual(threeAndFour);
  });

  it("can retrieve all states newer than a specified time", () => {
    const history = new StateHistory<number>(100);
    
    insertAt(history, 1);
    insertAt(history, 2, 10);
    const timestampOf3 = insertAt(history, 3, 10);
    insertAt(history, 4, 10);

    const oneAndTwo: Timestamped<number>[] = [
      {
        value: 1,
        timestamp: new Timestamp(new Date().getTime() - 30),
      },
      {
        value: 2,
        timestamp: new Timestamp(new Date().getTime() - 20),
      }
    ]

    expect(history.getStatesBefore(new Timestamp(timestampOf3))).toEqual(oneAndTwo);
  })
});


function insertAt<T>(history: StateHistory<T>, item: T, fastForwardMs: number = 0): number {
  const time = new Date().getTime() + fastForwardMs;
  MockDate.set(time);
  history.record(item);
  return time;
}