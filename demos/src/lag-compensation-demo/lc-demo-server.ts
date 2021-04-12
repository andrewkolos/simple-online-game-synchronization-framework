import { Entity, InputMessage, ServerEntitySyncer, StateMessage, TwoWayMessageBuffer, cloneDumbObject } from '../../../src';
import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { LcDemoEntityId } from './lc-demo-entity-ids';
import { LcDemoGameConfig } from './lc-demo-game-config';
import { LcDemoGameState } from './lc-demo-game-state';
import { lcDemoPlayerInputApplicator } from './lc-demo-player-input-applicator';
import { LcDemoPlayerInput, LcDemoPlayerState } from './player';
import { writeLcDemoEntityStatesToGame } from './write-lc-demo-entity-states-to-game';
import { makeLcDemoinputValidator} from './lc-demo-input-validator';
import { InheritableEventEmitter } from '@akolos/event-emitter';

enum LcDemoClientId {
  P1 = 'P1',
  P2 = 'P2',
}

namespace LcDemoClientId {
  export function assertIsValidId(id: string): id is LcDemoClientId {
    if (id !== LcDemoClientId.P1 && id !== LcDemoClientId.P2) {
      throw Error(`Invalid client ID, ${id}.`);
    }
    return true;
  }
  export function getEntityId(id: LcDemoClientId): LcDemoEntityId {
    return id === LcDemoClientId.P1 ? LcDemoEntityId.P1 : LcDemoEntityId.P2;
  }
}

export interface LcDemoGameServerEvents {
  updated: [gameState: LcDemoGameState];
}

export class LcDemoGameServer extends InheritableEventEmitter<LcDemoGameServerEvents> {

  private updateRateHz: number;
  private readonly entitySyncer: ServerEntitySyncer<LcDemoPlayerInput, LcDemoPlayerState>;
  private readonly game: LcDemoGameState;

  private loop: IntervalTaskRunner;

  public constructor(gameConfig: LcDemoGameConfig) {
    super();
    this.game = new LcDemoGameState(gameConfig);

    let c1IdAssigned = false;
    this.entitySyncer = new ServerEntitySyncer({
      clientIdAssigner: () => {
        if (!c1IdAssigned) {
          c1IdAssigned = true;
          return LcDemoClientId.P1;
        } else {
          return LcDemoClientId.P2;
        }
      },
      inputApplicator: lcDemoPlayerInputApplicator,
      inputValidator: makeLcDemoinputValidator(),
    });
  }

  public start(updateRateHz: number) {
    this.loop = new IntervalTaskRunner(() => this.update(), Interval.fromHz(updateRateHz)).start();
    this.updateRateHz = updateRateHz;
  }

  public stop() {
    if (this.loop != null) this.loop.stop();
  }

  public connectClient(connection: TwoWayMessageBuffer<InputMessage<LcDemoPlayerInput>, StateMessage<LcDemoPlayerState>>) {
    const cid = this.entitySyncer.connectClient(connection);
    if (!LcDemoClientId.assertIsValidId(cid)) throw Error();
    const pid = LcDemoClientId.getEntityId(cid);
    this.entitySyncer.addPlayerEntity({
      id: pid,
      state: cid === LcDemoClientId.P1 ? cloneDumbObject(this.game.player1) : cloneDumbObject(this.game.player2),
    }, cid);
  }

  private update() {
    const updatedEntities = this.entitySyncer.synchronize() as Array<Entity<LcDemoPlayerState>>;
    writeLcDemoEntityStatesToGame(updatedEntities, this.game);
    this.game.advanceSpawnTimers(Interval.fromHz(this.updateRateHz).ms);
    this.game.performLaserCollisions();
    this.writeSpawnTimersToEntities();
    this.emit('updated', this.game);
  }

  private writeSpawnTimersToEntities() {
    this.entitySyncer.setEntityState(LcDemoEntityId.P1, {
      timeUntilSpawnMs: this.game.player1.timeUntilSpawnMs,
    });
    this.entitySyncer.setEntityState(LcDemoEntityId.P2, {
      timeUntilSpawnMs: this.game.player2.timeUntilSpawnMs,
    });
  }
}
