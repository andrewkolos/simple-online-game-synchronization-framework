import { Laser, PlayerGeometry } from './lc-demo-game-state';

export function isLaserHittingTarget(laser: Laser, targetGeo: PlayerGeometry) {
  return laser.asSegment().intersectsPolygon(targetGeo.asOrderedPolygon());
}