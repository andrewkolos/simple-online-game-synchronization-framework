import { LagCompensator, ClientRequestValidator, RequestApplicator } from '../../src/networking/lag-compensation';
import { TimestampedBuffer, simpleResimulator } from '../../src/';
import { advanceTime } from './advanceTime';
import { cloneDumbObject } from '../../src/util/dumb-objects';

interface GameState {
  p1: number;
  p2: number;
}

interface LagCompRequest {
  timestamp: number;
}

class LagCompensatorRoot {
  private history: TimestampedBuffer<GameState>;
  private calculator: LagCompensator<GameState, LagCompRequest>;

  private compedTimestamped: Set<number> = new Set();

  public constructor(history: TimestampedBuffer<GameState>) {

    this.history = history;

    const requestValidator: ClientRequestValidator<LagCompRequest, GameState> = (request: LagCompRequest) => {
      const state = history.mostRecentTo(request.timestamp);

      if (!this.compedTimestamped.has(state.timestamp)) {
        this.compedTimestamped.add(state.timestamp);
        return true;
      }

      return false;
    };

    const requestApplicator: RequestApplicator<LagCompRequest, GameState> =
      (state: GameState, _request: LagCompRequest) => {
        const stateAfterComp: GameState = cloneDumbObject(state);
        stateAfterComp.p1 += 1;
        return stateAfterComp;
      };

    this.calculator = new LagCompensator({
      requestApplicator,
      requestValidator,
      resimmer: simpleResimulator,
    });
  }

  public increaseP1ScoreAt(time: number): boolean {
    return this.calculator.processRequest(this.history, {
      timestamp: time,
    });
  }
}

class CounterGame {
  public readonly state: GameState = { p1: 0, p2: 0 };

  constructor(public onScoreChanged?: (newScore: GameState) => void) { }

  public increaseP1() {
    this.state.p1++;
    this.handleScoreChange();
  }

  public decreaseP1() {
    this.state.p1--;
    this.handleScoreChange();
  }

  public increaseP2() {
    this.state.p2++;
    this.handleScoreChange();
  }

  public decreaseP2() {
    this.state.p2--;
    this.handleScoreChange();
  }

  public setScore(p1: number, p2: number) {
    this.state.p1 = p1;
    this.state.p2 = p2;
  }

  private handleScoreChange() {
    if (this.onScoreChanged != null) this.onScoreChanged(cloneDumbObject(this.state));
  }
}

function getHistoryObservedGame(): { game: CounterGame, history: TimestampedBuffer<GameState> } {
  const game = new CounterGame();
  const history = new TimestampedBuffer<GameState>(Number.MAX_SAFE_INTEGER);

  history.record(cloneDumbObject(game.state)); // Record initial state.

  game.onScoreChanged = (state: GameState) => {
    history.record(state);
  };

  return { game, history };
}

describe(nameof(LagCompensator), () => {
  it('Performs the initial state change correctly.', () => {

    const { game, history } = getHistoryObservedGame();
    const lagComper = new LagCompensatorRoot(history);
    advanceTime(1);
    game.increaseP1();
    advanceTime(1);
    game.increaseP2();
    advanceTime(1);
    game.increaseP1();

    lagComper.increaseP1ScoreAt(history.first().timestamp);

    expect(history.last().value).toEqual({
      p1: 3,
      p2: 1,
    });
  });
});
