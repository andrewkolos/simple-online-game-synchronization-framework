import { StateMessage } from '../../src/networking';
import { SyncStrategy } from '../../src/entity';
import { NewEntityHandler, NonLocalEntityResponse } from '../../src/synchronizers/client/new-entity-handler';
import { DemoPlayer } from './demo-player';

export class NewDemoPlayerHandler implements NewEntityHandler<DemoPlayer> {
  public createLocalEntityFromStateMessage(stateMessage: StateMessage<DemoPlayer>): DemoPlayer {
    const state = stateMessage.entity.state;
    if (state != null && state.position != null) {
      return new DemoPlayer(stateMessage.entity.id, {
        position: state.position,
      });
    }
    throw Error('Unable to convert state message into a game entity.');
  }

  public createNonLocalEntityFromStateMessage(stateMessage: StateMessage<DemoPlayer>): NonLocalEntityResponse<DemoPlayer> {
    return {
      entity: this.createLocalEntityFromStateMessage(stateMessage),
      syncStrategy: SyncStrategy.Interpolation,
    };
  }
}
