import { PlayerClientEntitySyncer, PlayerClientSyncerConnectionToServer } from '../../../src';
import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { EventEmitter } from 'typed-event-emitter';
import { createKeyboardLcDemoInputCollector, LcKeyboardDemoInputCollectorKeycodes } from './keyboard-LC-demo-input-collector';
import { LcDemoGameConfig } from './lc-demo-game-config';
import { LcDemoGameState } from './lc-demo-game-state';
import { lcDemoPlayerInputApplicator } from './lc-demo-player-input-applicator';
import { LcDemoPlayerInput, LcDemoPlayerState } from './player';
import { writeLcDemoEntityStatesToGame } from './write-lc-demo-entity-states-to-game';
import { makeLcDemoinputValidator } from './lc-demo-input-validator';

export interface LcDemoClientSyncArgs {
  syncRateHz: number;
  connectionToServer: PlayerClientSyncerConnectionToServer<LcDemoPlayerInput, LcDemoPlayerState>;
  keyMappings: LcKeyboardDemoInputCollectorKeycodes;
  serverUpdateRateHz: number;
}

export interface DisconnectedLcDemoClient {
  connect: () => Promise<LcDemoClient>;
}

export class LcDemoClient extends EventEmitter {

  public onUpdated = this.registerEvent<(gameState: LcDemoGameState) => void>();

  private game: LcDemoGameState;
  private readonly syncer: PlayerClientEntitySyncer<LcDemoPlayerInput, LcDemoPlayerState>;
  private loop: IntervalTaskRunner;

  public constructor(gameConfig: LcDemoGameConfig, syncArgs: LcDemoClientSyncArgs) {
    super();
    this.game = new LcDemoGameState(gameConfig);
    this.syncer = new PlayerClientEntitySyncer({
      connection: syncArgs.connectionToServer,
      localPlayerInputStrategy: {
        inputSource: createKeyboardLcDemoInputCollector(syncArgs.keyMappings),
        inputValidator: makeLcDemoinputValidator(),
        inputApplicator: lcDemoPlayerInputApplicator,
      },
      serverUpdateRateHz: syncArgs.serverUpdateRateHz,
    });
  }

  public start(updateRateHz: number) {
    this.loop = new IntervalTaskRunner(() => this.update(), Interval.fromHz(updateRateHz));
    this.loop.start();
  }

  public stop() {
    this.loop.stop();
  }

  public getNumberOfPendingInputs() {
    return this.syncer.getNumberOfPendingInputs();
  }

  private update() {
    const playerEntities = this.syncer.synchronize();
    writeLcDemoEntityStatesToGame(playerEntities, this.game);
    this.emit(this.onUpdated, this.game);
  }

  // private hitsOccurredOnServer(currentEntityStates: Array<Entity<LcDemoPlayerState>>): LaserCollisionResult {
  //   const result: LaserCollisionResult = {
  //     player1Destroyed: false,
  //     player2Destroyed: false,
  //   };

  //   currentEntityStates.forEach((e) => {
  //     if (e.id !== LcDemoEntityIds.P1 && e.id !== LcDemoEntityIds.P2) {
  //       throw Error(`Unknown entity id ${e.id}`);
  //     }
  //     const stateOnClient = e.id === LcDemoEntityIds.P1 ? this.game.player1 : this.game.player2;
  //     if (stateOnClient.timeUntilSpawnMs <= 0 && e.state.timeUntilSpawnMs > 0) {
  //       if (e.id === LcDemoEntityIds.P1) {
  //         result.player1Destroyed = true;
  //       } else {
  //         result.player2Destroyed = true;
  //       }
  //     }
  //   });

  //   return result;
  // }
}
