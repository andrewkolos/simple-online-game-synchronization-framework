import { ServerEntitySyncer } from '../../src/synchronizers/server/server-entity-synchronizer';
import { DemoPlayer, DemoPlayerInput, DemoPlayerState, demoPlayerInputApplicator } from './demo-player';
import { TwoWayMessageBuffer, InputMessage, StateMessage } from '../../src/networking';
import { EventEmitter } from 'typed-event-emitter';
import { ServerEntitySyncerRunner } from '../../src/synchronizers';
import { Entity } from '../../src/entity';

interface PlayerMovementInfo {
  entityId: string;
  lastInputTimestamp: number;
  pressTimeDuringLastInput: number;
  totalPressTimeInLast10Ms: number;
}

export interface DemoSyncServer {
  addClient(connection: TwoWayMessageBuffer<InputMessage<DemoPlayerInput>, StateMessage<DemoPlayerState>>): string;
  getSeqNumberOfLastInputProcessedFromClient(clientId: string): number;
}

export class DemoSyncServer extends EventEmitter {

  public readonly onSynchronized = this.registerEvent<(entities: ReadonlyArray<Entity<DemoPlayerState>>) => void>();

  private players: DemoPlayer[] = [];
  private playerMovementInfos: PlayerMovementInfo[] = [];
  private syncer = new ServerEntitySyncer({
    clientIdAssigner: () => this.getIdForNewClient(),
    inputApplicator: demoPlayerInputApplicator,
    inputValidator: (entity: DemoPlayer, input: DemoPlayerInput) => this.validateInput(entity, input),
  });
  private syncerRunner = new ServerEntitySyncerRunner(this.syncer);

  public constructor() {
    super();
    this.syncer.onSynchronized((entities) => this.emit(this.onSynchronized, entities));
  }

  public addClient(connection: TwoWayMessageBuffer<InputMessage<DemoPlayerInput>, StateMessage<DemoPlayerState>>): string {
    const clientId = this.syncer.connectClient(connection);

    const newPlayer: DemoPlayer = {id: clientId, state: {position: 0}};
    this.players.push(newPlayer);
    this.syncer.addPlayerEntity(newPlayer, clientId);
    this.playerMovementInfos.push({
      entityId: newPlayer.id,
      lastInputTimestamp: new Date().getTime(),
      pressTimeDuringLastInput: 0,
      totalPressTimeInLast10Ms: 0,
    });

    return clientId;
  }

  public getSeqNumberOfLastInputProcessedFromClient(clientId: string): number {
    return this.syncer.getLastProcessedInputForClient(clientId);
  }

  public start(updateRateHz: number) {
    this.syncerRunner.start(updateRateHz);
  }

  public stop() {
    this.syncerRunner.stop();
  }

  private getIdForNewClient(): string {
    return `c${this.players.length}`;
  }

  private validateInput(entity: DemoPlayer, input: DemoPlayerInput) {
    if ((input as DemoPlayerInput).direction != null) {
      const demoPlayerInput = input as DemoPlayerInput;
      const player = this.playerMovementInfos.find((info: PlayerMovementInfo) => {
        return info.entityId === entity.id;
      });
      if (player != null && demoPlayerInput.pressTime != null) {
        return player.lastInputTimestamp + demoPlayerInput.pressTime <= new Date().getTime();
      }
    }
    return false;
  }
}
