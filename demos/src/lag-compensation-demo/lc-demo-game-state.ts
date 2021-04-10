import { Segment, Polygon, Point } from './misc/geomtry';
import { LcDemoPlayerState } from './player';
import { LcDemoGameConfig } from './lc-demo-game-config';

export enum PlayerId {
  P1,
  P2,
}

export namespace PlayerId {
  export function playerMux(p1: LcDemoPlayerState, p2: LcDemoPlayerState, select: PlayerId): LcDemoPlayerState {
    return select === PlayerId.P1 ? p1 : p2;
  }
  export function opposite(p: PlayerId): PlayerId {
    return p === PlayerId.P1 ? PlayerId.P2 : PlayerId.P1;
  }
}

// NOTE: All coordinates are standard cartesian coordinates, with the origin residing at the bottom-left of the playfield.
// Y-offsets should be negated for standard screen-coordinate rendering.

interface PlayerGeometry {
  rearLeftSidePoint: Point;
  rearRightSidePoint: Point;
  tipPoint: Point;
  asOrderedPolygon: () => Polygon;
}

export interface LaserCollisionResult {
  player1Destroyed: boolean;
  player2Destroyed: boolean;
}

export class LcDemoGameState {

  public readonly player1: LcDemoPlayerState;
  public readonly player2: LcDemoPlayerState;

  public readonly respawnTimeMs: number;

  public readonly playfield = {
    width: 0,
    height: 0,
  };

  public get players(): Array<{ id: PlayerId, player: LcDemoPlayerState }> {
    return [{ id: PlayerId.P1, player: this.player1 }, { id: PlayerId.P2, player: this.player2 }];
  }

  public constructor(private readonly config: LcDemoGameConfig) {
    this.playfield.height = config.playFieldHeight;
    this.playfield.width = config.playFieldWidth;
    this.respawnTimeMs = config.respawnTimeMs;
    const defaultState = (pid: PlayerId): LcDemoPlayerState => ({
      rotationRads: pid === PlayerId.P1 ? 0 : Math.PI,
      timeUntilSpawnMs: 0,
      yOffset: pid === PlayerId.P1 ? this.config.playFieldHeight / 8 : - this.config.playFieldHeight / 8,
    });
    this.player1 = defaultState(PlayerId.P1);
    this.player2 = defaultState(PlayerId.P2);
  }

  public getLaser(player: PlayerId) {
    const physicalPlayer = PlayerId.playerMux(this.player1, this.player2, player);
    const geometry = this.getPlayerGeometry(physicalPlayer, player, this.playfield);
    const center = Polygon.findCenter(geometry.asOrderedPolygon());
    const laserOrigin = geometry.tipPoint;
    const laserEndPreRotation = Point.translate(laserOrigin, { x: this.config.playFieldWidth * 1.25, y: 0 });
    const laserEnd = Point.rotateAboutPoint(laserEndPreRotation, physicalPlayer.rotationRads, center);
    return {
      laserOrigin,
      laserEnd,
      asSegment(): Segment {
        return { p: laserOrigin, q: laserEnd };
      },
    };
  }

  public getPlayerGeometry(pState: LcDemoPlayerState, player: PlayerId, playfield: { height: number, width: number }): PlayerGeometry {
    const baseGeometry = (() => {
      const unit = this.config.playFieldWidth / 30;
      const distanceCenterBaseToAdjPoint = this.config.playFieldHeight / 20;

      return {
        rearLeftSidePoint: { x: -unit, y: distanceCenterBaseToAdjPoint },
        rearRightSidePoint: { x: -unit, y: -distanceCenterBaseToAdjPoint },
        tipPoint: { x: unit * 2, y: 0 },
        asOrderedPolygon(): Polygon {
          return { points: [this.rearLeftSidePoint, this.rearRightSidePoint, this.tipPoint] };
        },
      };
    })();

    const bBox = Polygon.computeBoundingBox(baseGeometry.asOrderedPolygon());
    const xPos = player === PlayerId.P1 ? bBox.width : playfield.width - bBox.width * 1.25;
    const defaultYPos = playfield.height / 2;

    const translated = Point.translate(baseGeometry.asOrderedPolygon().points, {
      x: xPos, y: defaultYPos + pState.yOffset,
    });

    const rotated = Polygon.rotate({ points: translated }, pState.rotationRads);

    return {
      rearLeftSidePoint: rotated.points[0],
      rearRightSidePoint: rotated.points[1],
      tipPoint: rotated.points[2],
      asOrderedPolygon(): Polygon {
        return { points: [this.rearLeftSidePoint, this.rearRightSidePoint, this.tipPoint] };
      },
    };
  }

  public advanceSpawnTimers(dtMs: number) {
    [this.player1, this.player2].forEach((p) => {
      if (p.timeUntilSpawnMs <= 0) return;
      p.timeUntilSpawnMs = Math.max(p.timeUntilSpawnMs - dtMs, 0);
    });
  }

  public isLaserHittingOpponent(offensivePlayer: PlayerId): boolean {
    const laser = this.getLaser(offensivePlayer);

    const opposingPlayer = this.getPlayerFromId(PlayerId.opposite(offensivePlayer));
    const opposingPlayerGeometry = this.getPlayerGeometry(opposingPlayer, PlayerId.opposite(offensivePlayer), this.playfield);

    return Segment.intersectsPolygon(laser.asSegment(), opposingPlayerGeometry.asOrderedPolygon());
  }

  public destroyPlayer(receivingPlayerId: PlayerId) {
    const receivingPlayer = this.getPlayerFromId(receivingPlayerId);
    const { respawnTimeMs: timeUntilSpawnMs } = this.config;
    receivingPlayer.timeUntilSpawnMs = timeUntilSpawnMs;
  }

  public performLaserCollisions(): LaserCollisionResult {
    const collisionResult = {
      player1Destroyed: false,
      player2Destroyed: false,
    };

    this.players.forEach((p) => {
      if (this.isLaserHittingOpponent(p.id)) {
        const opponent = PlayerId.opposite(p.id);
        const oppPlayer = this.getPlayerFromId(opponent);
        if (oppPlayer.timeUntilSpawnMs <= 0) {
          this.destroyPlayer(opponent);

          if (opponent === PlayerId.P1) {
            collisionResult.player1Destroyed = true;
          } else {
            collisionResult.player2Destroyed = true;
          }
        }
      }
    });

    return collisionResult;
  }

  private getPlayerFromId(playerId: PlayerId) {
    return PlayerId.playerMux(this.player1, this.player2, playerId);
  }
}
