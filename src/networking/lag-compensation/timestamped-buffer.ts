import { binarySearch, binarySearchClosestMatch } from '../..//util/binsearch';
import { singleLineify } from '../../util/singleLineify';
import { LruCache } from '../../util/lru-cache';

class Index {
  public constructor(public readonly value: number) { }
  public toString(): string {
    return String(this.value);
  }
}

class Timestamp {
  public constructor(public readonly value: number) { }
  public toString(): string {
    return String(this.value);
  }
}

export interface EntitySyncState<Input, State> {
  inputsToBeApplied: Input[];
  stateBeforeInputApplied: State;
  locked: boolean;
}

export interface Timestamped<T> {
  value: T;
  timestamp: number;
}

const enum SearchOutcome {
  Found,
  TooOldToStillExist,
  TooNewToExist,
  NeverCouldHaveExisted,
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

const enum SearchType {
  Exact,
  ClosestBefore,
}

export type GetStateResult<T> = FoundGetStateResult<T> | NotFoundGetStateResult;

/**
 * Collection for storing the history of an `ServerEntitySyncer`.
 * Before reading or writing to the history, states older than a given
 * time limit will be deleted.
 */
export class TimestampedBuffer<State> {

  private states: Array<Timestamped<State>> = [];

  private recordLengthMs: number;

  private indexCache = new LruCache<Timestamp, Index>(10);

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
  public rewrite(timestamp: number, state: State) {
    const index = this.indexOfStateAtUnsafe(new Timestamp(timestamp));

    this.states[index] = {
      timestamp,
      value: state,
    };
  }

  public first(): Timestamped<State> {
    this.checkEmptyUnsafe();
    return this.states[0];
  }

  public last(): Timestamped<State> {
    this.checkEmptyUnsafe();
    return this.states[this.states.length - 1];
  }

  /**
   * Gets the state (and its timestamp) that immediately follows a given timestamp.
   * @param timestamp The timestamp to search for to find the following state.
   * @returns The state (and its timestamp) that immediately follows the state at the argued timestamp.
   * `undefined` if there is no state after the provided timestamp (i.e. the provided timestamp is the
   * timestamp of the latest recorded state).
   * @throws Error if the provided timestamp doesn't exist in this history.
   */
  public next(timestamp: number): Timestamped<State> | undefined {

    const index = this.indexOfStateAtUnsafe(new Timestamp(timestamp));

    if (index === this.states.length - 1) return undefined;

    return this.states[index + 1];
  }

  public previous(timestamp: number): Timestamped<State> | undefined {
    const index = this.indexOfStateAtUnsafe(new Timestamp(timestamp));

    if (index === 0) return undefined;
    return this.states[index - 1];
  }

  public mostRecentTo(timestamp: number): Timestamped<State> {
    this.checkEmptyUnsafe();

    const index = this.indexOfStateAtUnsafe(new Timestamp(timestamp), SearchType.ClosestBefore);

    return this.states[index];
  }

  public slice(start?: number, end?: number) {
    const startIndex = start != null ? this.indexOfStateAtUnsafe(new Timestamp(start)) : 0;
    const endIndex = end != null ? this.indexOfStateAtUnsafe(new Timestamp(end)) : this.states.length;

    return this.states.slice(startIndex, endIndex);
  }

  public after(timestamp: number): ReadonlyArray<Readonly<Timestamped<State>>> {
    const index = this.indexOfStateAtUnsafe(new Timestamp(timestamp));

    return this.states.slice(index + 1);
  }

  public before(timestamp: number): ReadonlyArray<Readonly<Timestamped<State>>> {
    const index = this.indexOfStateAtUnsafe(new Timestamp(timestamp));

    return this.states.slice(0, index);
  }

  public record(state: State) {
    const now = new Date().getTime();

    this.purgeStatesOlderThanRecordLength();

    if (this.states.length > 0 && this.states[this.states.length - 1].timestamp > now) {
      throw new Error('Cannot record a state at a timestamp prior to the last one recorded.');
    }

    const timestampedState = {
      value: state,
      timestamp: now,
    };

    if (this.states.length > 0 && this.last().timestamp === now) {
      this.states.pop();
    }

    this.states.push(timestampedState);
  }

  private purgeStatesOlderThanRecordLength() {
    if (this.states.length === 0) return;

    const now = new Date().getTime();
    let elementsRemoved = 0;
    while (this.states.length > 0 && this.states[0].timestamp < now - this.recordLengthMs) {
      this.states.shift();
      elementsRemoved += 1;
    }

    this.indexCache.forEach((value: Index, key: Timestamp) => {
      this.indexCache.set(value, new Index(key.value - elementsRemoved));
    });
  }

  private indexOfStateAtSafe(timestamp: Timestamp, searchType: SearchType): SearchResult {
    const indexInCache = this.searchCache(timestamp);

    if (indexInCache != null) return {
      outcome: SearchOutcome.Found,
      index: new Index(indexInCache),
    };

    const earliestRecordedTimestamp = this.states[0].timestamp;
    if (timestamp.value < earliestRecordedTimestamp) {
      return { outcome: SearchOutcome.TooOldToStillExist };
    }

    const latestRecordTimestamp = this.states[this.states.length - 1].timestamp;
    if (timestamp.value > latestRecordTimestamp) {
      return { outcome: SearchOutcome.TooNewToExist };
    }

    const comparator = (o1: Timestamped<State>, o2: Timestamp) => o1.timestamp - o2.value;
    const index = searchType === SearchType.Exact ? binarySearch(this.states, timestamp, comparator) : (() => {
      const closestMatch = binarySearchClosestMatch(this.states, timestamp, comparator);
      return closestMatch.value.timestamp === timestamp.value ? closestMatch.index : closestMatch.index - 1;
    })();

    if (index == null) {
      return { outcome: SearchOutcome.NeverCouldHaveExisted };
    }

    return {
      outcome: SearchOutcome.Found,
      index: new Index(index),
    };
  }

  private indexOfStateAtUnsafe(timestamp: Timestamp, searchType: SearchType = SearchType.Exact): number {
    const result = this.indexOfStateAtSafe(timestamp, searchType);

    switch (result.outcome) {
      case SearchOutcome.NeverCouldHaveExisted:
        throw new Error(StateHistoryErrorMessage.readingFromEmptyHistory);
      case SearchOutcome.TooNewToExist:
        throw new Error('Timestamp to search for is later than that of the last recorded state.');
      case SearchOutcome.TooOldToStillExist:
        throw singleLineify`
          This history may have had a state with the provided timestamp, but by now has been cleared
          after recording another entry.
        `;
    }

    return result.index.value;
  }

  private searchCache(timestamp: Timestamp): number | undefined {
    const index = this.indexCache.get(timestamp);
    return index == null ? index : index.value;
  }

  private checkEmptyUnsafe(): void {
    if (this.states.length === 0) {
      throw Error(StateHistoryErrorMessage.readingFromEmptyHistory);
    }
  }
}

/** @internal */
export namespace StateHistoryErrorMessage {
  export const readingFromEmptyHistory = `Cannot read from history that has never been written to.`;
  export const requestedTimestampPredatesHistory = (earliestRecordedTimestamp: number, requestedTimestamp: number) =>
    `The requested timestamp (t=${requestedTimestamp}) predates the earliest recorded point in history (t=${earliestRecordedTimestamp}).`;
  export const noEntryAtRequestedTime = `Attempted to read/overwrite the entry at an exact timestamp, but no such entry exists.`;
}
