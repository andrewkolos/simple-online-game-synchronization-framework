import { AnyEntity, PickInput, PickState } from 'src/entity';
import { binarySearch } from 'src/util/binsearch';
import LRU from "lru-cache";
import { singleLineify } from 'src/util';

class Index {
  public constructor(public readonly value: number) { }
  public toString(): string {
    return String(this.value);
  }
}

export class Timestamp {
  public constructor(public readonly value: number) { }
  public toString(): string {
    return String(this.value);
  }
}

export type EntitySyncState<E extends AnyEntity> = {
  entity: E;
  inputsToBeApplied: PickInput<E>[];
  stateBeforeInputApplied: PickState<E>;
  locked: boolean;
}

export type Timestamped<T> = {
  value: T;
  timestamp: Timestamp;
}

const enum SearchOutcome {
  Found,
  TooOldToStillExist,
  TooNewToExist,
  NeverCouldHaveExisted
}

interface FoundSearchResult {
  outcome: SearchOutcome.Found;
  index: Index;
}

interface NotFoundSearchResult {
  outcome: SearchOutcome.TooOldToStillExist | SearchOutcome.TooNewToExist | SearchOutcome.NeverCouldHaveExisted;
  index?: undefined;
}

type SearchResult = FoundSearchResult | NotFoundSearchResult;

interface FoundGetStateResult<T> {
  outcome: SearchOutcome.Found;
  value: T;
}

interface NotFoundGetStateResult {
  outcome: SearchOutcome.TooNewToExist | SearchOutcome.TooOldToStillExist;
  value?: undefined;
}

export type GetStateResult<T> = FoundGetStateResult<T> | NotFoundGetStateResult;

/**
 * Collection for storing the history of an `ServerEntitySynchronizer`.
 * Before reading or writing to the history, states older than a given
 * time limit will be deleted.
 */
export class StateHistory<State> {

  private states: Timestamped<State>[] = [];

  private recordLengthMs: number;

  private indexCache = new LRU<Timestamp, Index>({
    max: 10,
  });

  /**
   * Creates a new `StateHistory`.
   * @param recordLengthMs How far back this history should go before states are deleted.
   */
  public constructor(recordLengthMs: number) {
    this.recordLengthMs = recordLengthMs;
  }

  /**
   * Gets the states recorded in this history, including their timestamps.
   */
  public getStates(): ReadonlyArray<Readonly<Timestamped<State>>> {
    this.purgeStatesOlderThanRecordLength();
    return this.states;
  }

  /**
   * Rewrites the state of this history at a given timestamp.
   * @param timestamp The timestamp of the state to rewrite, which should be obtained by one of this object's methods.
   * @param state The value to write to this timestamp, overwritng the previous value.
   */
  public rewrite(timestamp: Timestamp, state: State) {
    const index = this.indexOfStateAtUnsafe(timestamp);

    this.states[index] = {
      timestamp,
      value: state,
    };
  }

  /**
   * Gets the state (and its timestamp) that immediately follows a given timestamp.
   * @param timestamp The timestamp to search for to find the following state.
   * @returns The state (and its timestamp) that immediately follows the state at the argued timestamp.
   * `undefined` if there is no state after the provided timestamp (i.e. the provided timestamp is the 
   * timestamp of the latest recorded state).
   * @throws Error if the provided timestamp doesn't exist in this history.
   */
  public getNextState(timestamp: Timestamp): Timestamped<State> | undefined {

    const index = this.indexOfStateAtUnsafe(timestamp);

    if (index === this.states.length - 1) return undefined;

    return this.states[index + 1];
  }

  public getPreviousState(timestamp: Timestamp): Timestamped<State> | undefined {
    const index = this.indexOfStateAtUnsafe(timestamp);

    if (index === 0) return undefined;
    return this.states[index - 1];
  }

  public getStatesAfter(timestamp: Timestamp): ReadonlyArray<Readonly<Timestamped<State>>> {
    const index = this.indexOfStateAtUnsafe(timestamp);

    return this.states.slice(index + 1);
  }

  public getStatesBefore(timestamp: Timestamp): ReadonlyArray<Readonly<Timestamped<State>>> {
    const index = this.indexOfStateAtUnsafe(timestamp);

    return this.states.slice(0, index);
  }

  public record(state: State) {
    const timestamp = new Timestamp(new Date().getTime());

    this.purgeStatesOlderThanRecordLength();

    if (this.states.length > 0 && this.states[this.states.length - 1].timestamp.value > timestamp.value) {
      throw "Cannot record a state at a timestamp prior to the last one recorded.";
    }

    const timestampedState = {
      value: state,
      timestamp
    }

    this.states.push(timestampedState);
  }

  private purgeStatesOlderThanRecordLength() {
    if (this.states.length === 0) return;

    const now = new Date().getTime();
    let elementsRemoved = 0;
    while (this.states.length > 0 && this.states[0].timestamp.value < now - this.recordLengthMs) {
      this.states.shift();
      elementsRemoved += 1;
    }

    this.indexCache.forEach((value: Index, key: Timestamp) => {
      this.indexCache.set(value, new Index(key.value - elementsRemoved));
    });
  }

  private indexOfStateAtSafe(timestamp: Timestamp): SearchResult {
    const indexInCache = this.searchCache(timestamp);

    if (indexInCache != null) return {
      outcome: SearchOutcome.Found,
      index: new Index(indexInCache),
    };

    const earliestRecordedTimestamp = this.states[0].timestamp.value;
    if (timestamp.value < earliestRecordedTimestamp) {
      return { outcome: SearchOutcome.TooOldToStillExist };
    }

    const latestRecordTimestamp = this.states[this.states.length - 1].timestamp.value;
    if (timestamp.value > latestRecordTimestamp) {
      return { outcome: SearchOutcome.TooNewToExist };
    }

    const index = binarySearch(this.states, timestamp, (o1: Timestamped<State>, o2: Timestamp) => o1.timestamp.value - o2.value);

    if (index == null) {
      return { outcome: SearchOutcome.NeverCouldHaveExisted };
    }

    return {
      outcome: SearchOutcome.Found,
      index: new Index(index),
    }
  }

  private indexOfStateAtUnsafe(timestamp: Timestamp): number {
    const result = this.indexOfStateAtSafe(timestamp);

    switch (result.outcome) {
      case SearchOutcome.NeverCouldHaveExisted:
        throw "This history does not contain a state at the provided timestamp."
      case SearchOutcome.TooNewToExist:
        throw "Timestamp to search for is later than that of the last recorded state."
      case SearchOutcome.TooOldToStillExist:
        throw singleLineify`
          This history may have had a state with the provided timestamp, but by now has been cleared 
          after recording another entry.
        `
    }

    return result.index.value;
  }


  private searchCache(timestamp: Timestamp): number | undefined {
    const index = this.indexCache.values().findIndex((index: Index) =>
      this.states[index.value].timestamp.value === timestamp.value);
    return index === -1 ? undefined : index;
  }
}
