import { TimestampedBuffer, Timestamped } from './timestamped-buffer';

export interface ResimContext<GameState> {
  oldPreviousState: GameState;
  newPreviousState: GameState;
  oldCurrentState: GameState;
}

export type Resimulator<G> = (context: ResimContext<G>) => G;

export type RequestApplicator<State, Request> = (state: State, request: Request) => State;

export type ClientRequestValidator<Request> = (request: Request) => boolean;

export type RequestTimestampExtractor<Request> = (request: Request) => number;

export interface LagCompensatorCalculatorArgs<GameState, ClientRequest> {
  resimmer: Resimulator<GameState>;
  requestApplicator: RequestApplicator<GameState, ClientRequest>;
  requestValidator: ClientRequestValidator<ClientRequest>;
  timestampExtractor: RequestTimestampExtractor<ClientRequest>;
}

interface LagCompensatorCalculatorPositiveResponse {
  requestAccepted: true;
}

interface LagCompensatorCalculatorNegativeResponse {
  requestAccepted: false;
}

export type LagCompensatorResponse =
  LagCompensatorCalculatorPositiveResponse | LagCompensatorCalculatorNegativeResponse;

export class LagCompensator<GameState, ClientRequest> {

  private resimmer: Resimulator<GameState>;
  private requestApplicator: RequestApplicator<GameState, ClientRequest>;
  private requestValidator: ClientRequestValidator<ClientRequest>;
  private timestampExtractor: RequestTimestampExtractor<ClientRequest>;

  public constructor(args: LagCompensatorCalculatorArgs<GameState, ClientRequest>) {
    this.resimmer = args.resimmer;
    this.requestApplicator = args.requestApplicator;
    this.requestValidator = args.requestValidator;
    this.timestampExtractor = args.timestampExtractor;
  }

  public processRequest(serverHistory: TimestampedBuffer<GameState>, request: ClientRequest): LagCompensatorResponse {

    const stateHistory = Array.from(serverHistory.slice(this.timestampExtractor(request)));

    if (stateHistory.length === 0) {
      return { requestAccepted: false };
    }

    const gameStateAtRequestedTime = stateHistory[0];

    if (!this.requestValidator(request)) return { requestAccepted: false };

    const stateAfterCompensation = this.requestApplicator(gameStateAtRequestedTime.value, request);

    const resimulatedStates = this.resimulate(stateHistory, stateAfterCompensation);
    resimulatedStates.forEach((state: Timestamped<GameState>) => serverHistory.rewrite(state.timestamp, state.value));

    return {
      requestAccepted: true,
    };
  }

  private resimulate(history: Array<Timestamped<GameState>>, firstStateAfterCompensation: GameState): Array<Timestamped<GameState>> {
    const newHistory: Array<Timestamped<GameState>> = [{ timestamp: history[0].timestamp, value: firstStateAfterCompensation }];
    if (history.length === 1) return newHistory;

    for (let i = 1; i < history.length; i++) {
      const newState = this.resimmer({
        oldPreviousState: history[i - 1].value,
        newPreviousState: newHistory[i - 1].value,
        oldCurrentState: history[i].value,
      });
      newHistory.push({ timestamp: history[i].timestamp, value: newState });
    }

    return newHistory;
  }
}
