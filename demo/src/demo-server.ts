import { ServerEntitySyncer } from '../../src/synchronizers/server/server-entity-synchronizer';
import { DemoPlayer, DemoPlayerInput, DemoPlayerState, demoPlayerInputApplicator } from './demo-player';

interface PlayerMovementInfo {
  entityId: string;
  lastInputTimestamp: number;
  pressTimeDuringLastInput: number;
  totalPressTimeInLast10Ms: number;
}

export function createDemoServerSyncer(): ServerEntitySyncer<DemoPlayerInput, DemoPlayerState> {

  const players: DemoPlayer[] = [];
  const playerMovementInfos: PlayerMovementInfo[] = [];
  const syncer = new ServerEntitySyncer({
    clientIdAssigner: getIdForNewClient,
    connectionHandler: handleClientConnection,
    inputApplicator: demoPlayerInputApplicator,
    inputValidator: validateInput,
  });

  function handleClientConnection(clientId: string): void {
    const newPlayer: DemoPlayer = { id: clientId, state: { position: 0 } };
    players.push(newPlayer);
    syncer.addPlayerEntity(newPlayer, clientId);
    playerMovementInfos.push({
      entityId: newPlayer.id,
      lastInputTimestamp: new Date().getTime(),
      pressTimeDuringLastInput: 0,
      totalPressTimeInLast10Ms: 0,
    });
  }

  function getIdForNewClient(): string {
    return `c${players.length}`;
  }

  function validateInput(entity: DemoPlayer, input: DemoPlayerInput) {
    if ((input as DemoPlayerInput).direction != null) {
      const demoPlayerInput = input as DemoPlayerInput;
      const player = playerMovementInfos.find((info: PlayerMovementInfo) => {
        return info.entityId === entity.id;
      });
      if (player != null && demoPlayerInput.pressTime != null) {
        return player.lastInputTimestamp + demoPlayerInput.pressTime <= new Date().getTime();
      }
    }
    return false;
  }

  return syncer;
}
