import { StateMessage } from '../../src/networking';
import { EntityFactory } from '../../src/synchronizers/client/entity-factory';
import { DemoPlayer, DemoPlayerState } from './demo-player';

export class DemoEntityFactory implements EntityFactory<DemoPlayer> {

  public constructor(private readonly serverUpdateRateHz: number) {}

  public fromStateMessage(stateMessage: StateMessage<DemoPlayerState>): DemoPlayer {
    const state = stateMessage.entity.state;
    if (state != null && state.position != null) {
      return new DemoPlayer(stateMessage.entity.id, {
        position: state.position,
      }, this.serverUpdateRateHz);
    }
    throw Error('Unable to convert state message into a game entity.');
  }
}
