import { ServerEntitySynchronizer } from '../../src/synchronizers/server/server-entity-synchronizer';
import { DemoPlayer, DemoPlayerInput } from './demo-player';
import { PlayerEntity, AnyEntity } from '../../src/entity';

interface PlayerMovementInfo {
  entityId: string;
  lastInputTimestamp: number;
  pressTimeDuringLastInput: number;
  totalPressTimeInLast10Ms: number;
}

export class DemoServer extends ServerEntitySynchronizer<DemoPlayer> {

  private players: DemoPlayer[] = [];
  private playerMovementInfos: PlayerMovementInfo[] = [];

  protected handleClientConnection(clientId: string): void {
    const newPlayer = new DemoPlayer(clientId, { position: 0 }, 1);
    this.players.push(newPlayer);
    this.addPlayerEntity(newPlayer, clientId);
    this.playerMovementInfos.push({
      entityId: newPlayer.id,
      lastInputTimestamp: new Date().getTime(),
      pressTimeDuringLastInput: 0,
      totalPressTimeInLast10Ms: 0,
    });
  }

  protected getIdForNewClient(): string {
    return `c${this.players.length}`;
  }

  protected validateInput(entity: AnyEntity, input: any) {
    if (entity instanceof PlayerEntity && (input as DemoPlayerInput).direction != null) {
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
