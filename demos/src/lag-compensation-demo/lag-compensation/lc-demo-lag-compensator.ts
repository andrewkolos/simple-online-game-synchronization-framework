// import { Resimulator, RequestApplicator, ClientRequestValidator, TimestampedBuffer } from '@akolos/ts-client-server-game-synchronization';
// import { LcDemoGameState, PlayerId } from '../lc-demo-game-state';
// import { LcDemoGameServer } from '../lc-demo-server';

// export interface LcDemoLcRequest {
//   requestingPlayer: PlayerId;
//   timestamp: number;
//   yOffset: number;
//   rotationRads: number;
// }

// export class LcDemoLagCompensator {
//   public constructor(server: LcDemoGameServer) {
//     const resimmer: Resimulator<LcDemoGameState> = (args) => {
//       const oldCurrentState = args.oldCurrentState.value;
//       const oldPreviousState = args.oldPreviousState.value;
//       const newPreviousState = args.newPreviousState.value;
//       const dt = args.oldCurrentState.timestamp - args.oldPreviousState.timestamp;

//       const newCurrentState = oldCurrentState.clone();
//       newCurrentState.players.forEach(({ id, player }) => {
//         const playerInOldPreviousState = oldPreviousState.getPlayerById(id);
//         const playerInNewPreviousState = newPreviousState.getPlayerById(id);
//         const newStunTime = Math.max(newPreviousState.getPlayerById(id).timeUntilSpawnMs - dt, 0);

//         if (newStunTime > 0) {
//           player.timeUntilSpawnMs = newStunTime;  
//         } else {
//           player.rotationRads += playerInNewPreviousState.rotationRads - playerInOldPreviousState.rotationRads;
//           player.yOffset += playerInNewPreviousState.yOffset - playerInOldPreviousState.yOffset;
//         }
//       });
//       return newCurrentState;
//     };
//     const requestApp: RequestApplicator<LcDemoGameState, LcDemoLcRequest> = (state: LcDemoGameState, request: LcDemoLcRequest) => {
      
//     };
//     const requestValidator: ClientRequestValidator<LcDemoLcRequest> = (request: LcDemoLcRequest, history: TimestampedBuffer<LcDemoGameState>) => {

//     };
//   }
// }