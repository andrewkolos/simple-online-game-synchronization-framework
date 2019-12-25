import { ServerEntitySyncer, EntityCollection, ServerSyncRecordCollection } from '../../synchronizers';
import { ChronologicalBuffer } from './chronological-buffer';

export type LagCompRequestValidator<State, Request> =
  (request: Request, clientsPerceptionOfEntities: EntityCollection<State>) => boolean;

export type LagCompRequestApplicator<State, Request> =
  (request: Request, entityStates: EntityCollection<State>) => void;

export type ResimHandler<State> =
  (oldPreviousState: EntityCollection<State>, newPreviousState: EntityCollection<State>, oldCurrentState: EntityCollection<State>) => void;

export interface LagCompRequestProcessingStrategy<State, Request> {
  validator: LagCompRequestValidator<State, Request>;
  applicator: LagCompRequestApplicator<State, Request>;
}

export interface LcRequestingClient {
  clientId: string;
  latencyMs: number;
}

export class LagCompensator<Input, State, Request> {

  private readonly serverHistory = new ChronologicalBuffer<ServerSyncRecordCollection<Input, State>>(this.serverHistoryMemoryMs);

  public constructor(
    private readonly server: ServerEntitySyncer<Input, State>,
    private readonly requestProcessingStrategy: LagCompRequestProcessingStrategy<State, Request>,
    private readonly serverHistoryMemoryMs: number = 250,
  ) {
    server.onSynchronized((stateChanges) => {
      this.serverHistory.record(stateChanges);
    });
  }

  public processRequest(request: Request, client: LcRequestingClient, validRequestHandler?: ResimHandler<State>): boolean {
    
  }

  private getClientPerceptionOfEntities(timestamp: number, client: LcRequestingClient) {
    const serverState = this.serverHistory.slice()
  }
}
