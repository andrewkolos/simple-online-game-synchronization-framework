import { Point } from '../../lag-compensation-demo/misc/geomtry';

export namespace GeometryDrawing {
  export function pathSegments(ctx: CanvasRenderingContext2D, points: Point[]) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  }

  export function pathSegment(ctx: CanvasRenderingContext2D, p: Point, q: Point) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.closePath();
  }
}
