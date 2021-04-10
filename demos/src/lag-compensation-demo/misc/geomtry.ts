export interface Point {
  x: number;
  y: number;
}

export type Vector2 = Point;

export interface Segment {
  p: Point;
  q: Point;
}

export interface Polygon {
  points: Point[];
}

export interface Rectangle {
  min: Point;
  max: Point;
}

export namespace Point {
  export function rotateAboutOrigin(p: Point, rads: number) {
    return {
      x: p.x * Math.cos(rads) - p.y * Math.sin(rads),
      y: p.x * Math.sin(rads) + p.y * Math.cos(rads),
    };
  }

  export function rotateAboutPoint(p: Point, rads: number, about: Point) {
    const reOriginAtOrigin = { x: p.x - about.x, y: p.y - about.y };
    const rotatedAboutOrigin = rotateAboutOrigin(reOriginAtOrigin, rads);
    const translatedBack = { x: rotatedAboutOrigin.x + about.x, y: rotatedAboutOrigin.y + about.y };
    return translatedBack;
  }

  export function translate(point: Point, t: Vector2): Point;
  export function translate(points: Point[], t: Vector2): Point[];
  export function translate(point: Point | Point[], t: Vector2) {
    if (Array.isArray(point)) {
      return point.map((p: Point) => ({ x: p.x + t.x, y: p.y + t.y }));
    } else {
      return { x: point.x + t.x, y: point.y + t.y };
    }
  }
}

export namespace Segment {
  // http://www.jeffreythompson.org/collision-detection/line-line.php
  export function intersectsSegment(a: Segment, b: Segment) {
    const { p: { x: x1, y: y1 }, q: { x: x2, y: y2 } } = a;
    const { p: { x: x3, y: y3 }, q: { x: x4, y: y4 } } = b;

    const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
  }

  export function intersectsPolygon(segment: Segment, poly: Polygon) {
    const collidingWithAnySegment = Polygon.getSegments(poly).some((polySegment: Segment) =>
      Segment.intersectsSegment(segment, polySegment));

    return collidingWithAnySegment;
  }

  export function getCenter(segment: Segment): Point {
    const { p, q } = segment;
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  }

  export function centerAt(segment: Segment, point: Point) {
    const center = getCenter(segment);

    return {
      p: {
        x: segment.p.x - center.x + point.x,
        y: segment.p.y - center.y + point.y,
      },
      q: {
        x: segment.q.x - center.x + point.x,
        y: segment.q.y - center.y + point.y,
      },
    };
  }

}

export namespace Polygon {
  export function intersectsSegment(polygon: Polygon, segment: Segment): boolean {
    return Segment.intersectsPolygon(segment, polygon);
  }

  export function intersectsPolygon(a: Polygon, b: Polygon): boolean {
    return Polygon.getSegments(a).some((aSegment: Segment) => Segment.intersectsPolygon(aSegment, b));
  }

  export function getSegments(polygon: Polygon): Segment[] {
    const { points } = polygon;
    const L = points.length;

    return points.reduce((acc: Segment[], current: Point, index: number) => {
      const next: Point = points[(index + 1) % L];
      acc.push({
        p: {
          x: current.x,
          y: current.y,
        },
        q: {
          x: next.x,
          y: next.y,
        },
      });
      return acc;
    }, [] as Segment[]);
  }

  export function rotate(polygon: Polygon, rads: number): Polygon {
    const { points } = polygon;

    const center = findCenter(polygon);

    return {
      points: points.map((p) => Point.rotateAboutPoint(p, rads, center)),
    };
  }

  export function computeBoundingBox(polygon: Polygon) {
    const { points } = polygon;
    const minPoint: Point = {
      x: minimum(points, (a, b) => a.x - b.x).x,
      y: minimum(points, (a, b) => a.y - b.y).y,
    };
    const maxPoint: Point = {
      x: maximum(points, (a, b) => a.x - b.x).x,
      y: maximum(points, (a, b) => a.y - b.y).y,
    };

    return {
      min: minPoint,
      max: maxPoint,
      width: Math.pow(Math.pow(maxPoint.x - minPoint.x, 2), 1 / 2),
      length: Math.pow(Math.pow(maxPoint.y - minPoint.y, 2), 1 / 2),
      asPolygon() {
        const minXMaxY = { x: this.min.x, y: this.max.y };
        const maxXMinY = { x: this.max.x, y: this.min.y };

        return { points: [minXMaxY, this.max, maxXMinY, this.min] };
      },
    };
  }

  export function findCenter(polygon: Polygon): Point {
    const { points } = polygon;

    const boundingBoxMinPoint: Point = {
      x: minimum(points, (a, b) => a.x - b.x).x,
      y: minimum(points, (a, b) => a.y - b.y).y,
    };
    const boundingBoxMaxPoint: Point = {
      x: maximum(points, (a, b) => a.x - b.x).x,
      y: maximum(points, (a, b) => a.y - b.y).y,
    };

    const boundingBoxMidPoint: Point = {
      x: boundingBoxMinPoint.x + (boundingBoxMaxPoint.x - boundingBoxMinPoint.x) / 2,
      y: boundingBoxMinPoint.y + (boundingBoxMaxPoint.y - boundingBoxMinPoint.y) / 2,
    };

    return boundingBoxMidPoint;
  }
}

export namespace Rectangle {
  export function asPolygon(rect: Rectangle): Polygon {
    const { min, max } = rect;
    const minXMaxY = { x: min.x, y: max.y };
    const maxXMinY = { x: max.x, y: min.y };

    return { points: [minXMaxY, max, maxXMinY, min] };
  }
}

function minimum<T>(a: T[], comparator: (a: T, b: T) => number) {
  return a.reduce((min: T, current: T) => comparator(min, current) <= 0 ? min : current);
}

function maximum<T>(a: T[], comparator: (a: T, b: T) => number) {
  return a.reduce((max: T, current: T) => comparator(max, current) >= 0 ? max : current);
}
