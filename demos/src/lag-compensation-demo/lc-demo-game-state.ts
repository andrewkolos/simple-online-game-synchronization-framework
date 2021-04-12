import { Polygon, Point, Segment } from './misc/geomtry';
import { LcDemoPlayerState } from './player';
import { LcDemoGameConfig } from './lc-demo-game-config';
import { cloneDumbObject } from '@akolos/ts-client-server-game-synchronization';

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

export interface PlayerGeometry {
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

  public constructor(config: LcDemoGameConfig);
  public constructor(state: LcDemoGameState);
  public constructor(configOrState: LcDemoGameConfig | LcDemoGameState) {
    if (configOrState instanceof LcDemoGameState) {
      const state = configOrState;
      this.playfield = cloneDumbObject(state.playfield);
      this.player1 = cloneDumbObject(state.player1);
      this.player2 = cloneDumbObject(state.player2);
      this.respawnTimeMs = state.respawnTimeMs;
    } else {
      const config = configOrState;
      this.playfield.height = config.playFieldHeight;
      this.playfield.width = config.playFieldWidth;
      this.respawnTimeMs = config.respawnTimeMs;
      const defaultState = (pid: PlayerId): LcDemoPlayerState => ({
        rotationRads: pid === PlayerId.P1 ? 0 : Math.PI,
        timeUntilSpawnMs: 0,
        yOffset: pid === PlayerId.P1 ? config.playFieldHeight / 8 : - config.playFieldHeight / 8,
      });
      this.player1 = defaultState(PlayerId.P1);
      this.player2 = defaultState(PlayerId.P2);
    }
  }

  public getLaser(player: PlayerId): Segment {
    const physicalPlayer = this.getPlayerFromId(player);
    const geometry = this.getPlayerGeometry(player);
    const center = geometry.asOrderedPolygon().findCenter();
    const origin = geometry.tipPoint;
    const laserEndPreRotation = origin.translate(new Point(this.playfield.width * 1.25, 0));
    const end = laserEndPreRotation.rotateAboutPoint(physicalPlayer.rotationRads, center);
    return new Segment(origin, end);
  }

  public getPlayerGeometry(player: PlayerId): PlayerGeometry {

    const pState = PlayerId.playerMux(this.player1, this.player2, player);
    const playfield = this.playfield;
    const baseGeometry = (() => {
      const unit = this.playfield.width / 30;
      const distanceCenterBaseToAdjPoint = this.playfield.height / 20;

      return {
        rearLeftSidePoint: new Point(-unit, distanceCenterBaseToAdjPoint),
        rearRightSidePoint: new Point(-unit, -distanceCenterBaseToAdjPoint),
        tipPoint: new Point(unit * 2, 0),
        asOrderedPolygon(): Polygon {
          return new Polygon([this.rearLeftSidePoint, this.rearRightSidePoint, this.tipPoint]);
        },
      };
    })();

    const bBox = baseGeometry.asOrderedPolygon().computeBoundingBox();
    const xPos = player === PlayerId.P1 ? bBox.width : playfield.width - bBox.width * 1.25;
    const defaultYPos = playfield.height / 2;

    const translated = new Polygon(
      baseGeometry.asOrderedPolygon()
        .points
        .map(p => p.translate(new Point(xPos, defaultYPos + pState.yOffset)))
    );

    const rotated = translated.rotate(pState.rotationRads);

    return {
      rearLeftSidePoint: rotated.points[0],
      rearRightSidePoint: rotated.points[1],
      tipPoint: rotated.points[2],
      asOrderedPolygon(): Polygon {
        return new Polygon([this.rearLeftSidePoint, this.rearRightSidePoint, this.tipPoint]);
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

    const opposingPlayerGeometry = this.getPlayerGeometry(PlayerId.opposite(offensivePlayer));

    return laser.intersectsPolygon(opposingPlayerGeometry.asOrderedPolygon());
  }

  public destroyPlayer(receivingPlayerId: PlayerId) {
    const receivingPlayer = this.getPlayerFromId(receivingPlayerId);
    receivingPlayer.timeUntilSpawnMs = this.respawnTimeMs;
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

  public getPlayerFromId(playerId: PlayerId): LcDemoPlayerState {
    return PlayerId.playerMux(this.player1, this.player2, playerId);
  }
}
