// import { Resimulator, RequestApplicator, LagCompensator, LagCompensationRequestValidator, LagCompensationRequestValidationContext } from '../../../../src';
// import { isLaserHittingTarget } from '../is-laser-hitting-target';
// import { LcDemoGameState, PlayerId } from '../lc-demo-game-state';
// import { LcDemoGameServer } from '../lc-demo-server';

// export interface LcDemoLcRequest {
//   requestingPlayer: PlayerId;
//   timestamp: number;
//   yOffset: number;
//   rotationRads: number;
// }

// export function CreateLcDemoLagCompensator(server: LcDemoGameServer): LagCompensator<LcDemoGameState, LcDemoLcRequest> {
//   const resimmer: Resimulator<LcDemoGameState> = (args) => {
//     const oldCurrentState = args.oldCurrentState.value;
//     const oldPreviousState = args.oldPreviousState.value;
//     const newPreviousState = args.newPreviousState.value;
//     const dt = args.oldCurrentState.timestamp - args.oldPreviousState.timestamp;

//     const newCurrentState = new LcDemoGameState(oldCurrentState);
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
//     const opposingPlayerId = PlayerId.opposite(request.requestingPlayer);
//     const otherPlayer = state.getPlayerGeometry(opposingPlayerId);
//     isLaserHittingTarget(state.getLaser(request.requestingPlayer), otherPlayer);
//     const newState = new LcDemoGameState(state);
//     newState.destroyPlayer(opposingPlayerId);
//     return newState;
//   };
//   const requestValidator: LagCompensationRequestValidator<LcDemoLcRequest, LcDemoGameState> = 
//     (request: LcDemoLcRequest, context: LagCompensationRequestValidationContext<LcDemoLcRequest>) => {
    
//     request.timestamp
//   };

//   return new LagCompensator({resimmer, requestApplicator, requestValidator})
// }