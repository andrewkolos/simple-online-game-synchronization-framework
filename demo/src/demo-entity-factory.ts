import { StateMessage } from '../../src/networking';
import { EntityFactory } from '../../src/synchronizers/client/entity-factory';
import { DemoPlayer, DemoPlayerState } from './demo-player';
import { SyncToServerStrategy } from '../../src/entity';

export class DemoEntityFactory implements EntityFactory<DemoPlayer> {

  public constructor(private readonly serverUpdateRateHz: number) {}

  public fromStateMessage(stateMessage: StateMessage<DemoPlayerState>): DemoPlayer {
    const {id, state} = stateMessage.entity;
    if (state != null && state.position != null) {
      return new DemoPlayer(id, state, SyncToServerStrategy.linearInterpolation(this.serverUpdateRateHz));
    }
    throw Error('Failed to convert state message into a game entity.');
  }
}
