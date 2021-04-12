// import { Resimulator, RequestApplicator, ClientRequestValidator, TimestampedBuffer, LagCompensator } from '../../../../src';
// import { cloneDumbObject } from '../../../../src';
// import { isLaserHittingTarget } from '../is-laser-hitting-target';
// import { LcDemoGameState, PlayerId } from '../lc-demo-game-state';
// import { LcDemoGameServer } from '../lc-demo-server';

// export interface LcDemoLcRequest {
//   requestingPlayer: PlayerId;
//   timestamp: number;
//   yOffset: number;
//   rotationRads: number;
// }

// export function CreateLcDemoLagCompensator(): LagCompensator<LcDemoGameState, LcDemoLcRequest> {
//   const resimmer: Resimulator<LcDemoGameState> = (args) => {
//     const oldCurrentState = args.oldCurrentState.value;
//     const oldPreviousState = args.oldPreviousState.value;
//     const newPreviousState = args.newPreviousState.value;
//     const dt = args.oldCurrentState.timestamp - args.oldPreviousState.timestamp;

//     const newCurrentState = cloneDumbObject(oldCurrentState);
//     newCurrentState.players.forEach(({ id, player }) => {
//       const playerInOldPreviousState = oldPreviousState.getPlayerFromId(id);
//       const playerInNewPreviousState = newPreviousState.getPlayerFromId(id);
//       const newStunTime = Math.max(newPreviousState.getPlayerFromId(id).timeUntilSpawnMs - dt, 0);

//       if (newStunTime > 0) {
//         player.timeUntilSpawnMs = newStunTime;
//       } else {
//         player.rotationRads += playerInNewPreviousState.rotationRads - playerInOldPreviousState.rotationRads;
//         player.yOffset += playerInNewPreviousState.yOffset - playerInOldPreviousState.yOffset;
//       }
//     });
//     return newCurrentState;
//   };
//   const requestApplicator: RequestApplicator<LcDemoLcRequest, LcDemoGameState> = (state: LcDemoGameState, request: LcDemoLcRequest) => {
//     const otherPlayer = state.getPlayerGeometry(PlayerId.opposite(request.requestingPlayer));
//     isLaserHittingTarget(state.getLaser(request.requestingPlayer), otherPlayer);
    
    
//   };
//   const requestValidator: ClientRequestValidator<LcDemoLcRequest> = (request: LcDemoLcRequest, history: TimestampedBuffer<LcDemoGameState>) => {
//     if 
//   };

//   return new LagCompensator({resimmer, requestApplicator, requestValidator})
// }