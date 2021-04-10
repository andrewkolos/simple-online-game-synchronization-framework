import React, { RefObject } from 'react';
import { LcDemoGameState, PlayerId } from '../../lag-compensation-demo/lc-demo-game-state';
import { Point, Polygon } from '../../lag-compensation-demo/misc/geomtry';
import { GeometryDrawing } from '../common/geometry-drawer';

interface DemoGameRendererProps {
  game: LcDemoGameState;
}

export class LcDemoGameRendererComponent extends React.Component<DemoGameRendererProps> {

  private canvasRef: RefObject<HTMLCanvasElement>;

  constructor(props: DemoGameRendererProps) {
    super(props);
    this.canvasRef = React.createRef<HTMLCanvasElement>();
  }

  public componentDidUpdate(props: DemoGameRendererProps) {
    const { game } = props;
    const canvas = this.canvasRef.current;

    if (canvas == null) return;
    canvas.width = canvas.width; // Clears canvas.
    const ctx = canvas.getContext('2d');
    if (ctx == null) throw Error('Canvas context is undefined');

    const { height: playfieldHeight, width: playfieldWidth } = game.playfield;
    ctx.fillStyle = 'gray';
    ctx.fillRect(0, 0, playfieldWidth, playfieldHeight);

    const playerColors = {
      [PlayerId.P1]: 'blue',
      [PlayerId.P2]: 'red',
    };

    const laserColors = {
      [PlayerId.P1]: 'cyan',
      [PlayerId.P2]: 'yellow',
    };

    [{ id: PlayerId.P1, player: game.player1 }, { id: PlayerId.P2, player: game.player2 }].forEach((o) => {
      const { id, player } = o;
      const geometry = game.getPlayerGeometry(player, id, game.playfield).asOrderedPolygon();
      const laser = game.getLaser(id).asSegment();

      (function renderLaser() {
        if (player.timeUntilSpawnMs <= 0) {
          GeometryDrawing.pathSegment(ctx, screenCoords(laser.p), screenCoords(laser.q));
          ctx.lineWidth = 1;
          ctx.strokeStyle = (laserColors as any)[id];
          ctx.stroke();
        }
      })();
      (function renderPlayer() {
        if (player.timeUntilSpawnMs > 0) {
          ctx.globalAlpha = 0.2;
        }
        GeometryDrawing.pathSegments(ctx, screenCoords(geometry.points));
        ctx.fillStyle = (playerColors as any)[id];
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'dark' + (playerColors as any)[id];
        // https://stackoverflow.com/questions/36615592/canvas-inner-stroke
        ctx.save();
        ctx.clip();
        ctx.lineWidth *= 2;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1.0;
      })();


      (function renderSpawnTimer() {
        if (player.timeUntilSpawnMs > 0) {
          const pLoc = Polygon.findCenter(geometry);
          const bBox = Polygon.computeBoundingBox(geometry);
          const maxDimension = Math.max(bBox.length, bBox.width);
          const percentTimeUntilSpawn = player.timeUntilSpawnMs / game.respawnTimeMs * 100;

          ctx.lineWidth = 5;

          ctx.beginPath();
          ctx.strokeStyle = 'rgb(221,221,221)';
          ctx.arc(pLoc.x, screenCoords(pLoc).y, maxDimension, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = 'rgb(65, 255, 65)';
          ctx.arc(pLoc.x, screenCoords(pLoc).y, maxDimension, 3 * Math.PI / 2, percentToRad(percentTimeUntilSpawn));
          ctx.stroke();
        }
      })();
    });

    function screenCoords(p: Point): Point;
    function screenCoords(p: Point[]): Point[];
    function screenCoords(p: Point | Point[]) {
      if (Array.isArray(p)) {
        return p.map((pi) => screenCoord(pi, playfieldHeight));
      } else {
        return screenCoord(p, playfieldHeight);
      }
    }
  }

  public render() {
    return (
      <canvas width={this.props.game.playfield.width} height={this.props.game.playfield.height} ref={this.canvasRef}></canvas>
    );
  }

}

function percentToRad(percent: number): number {
  return 3 * Math.PI / 2 - (2 * Math.PI * percent / 100);
}

function screenCoord(p: Point, planeHeight: number): Point {
  return { x: p.x, y: planeHeight - p.y };
}
