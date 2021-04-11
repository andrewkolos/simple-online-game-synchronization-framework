export type Vector2 = Point;

export class Point {
  public constructor(public readonly x: number, public readonly y: number) { }

  public rotateAboutOrigin(p: Point, rads: number): Point {
    return new Point(
      p.x * Math.cos(rads) - p.y * Math.sin(rads),
      p.x * Math.sin(rads) + p.y * Math.cos(rads),
    );
  }

  public rotateAboutPoint(rads: number, about: Point): Point {
    const reOriginAtOrigin = new Point(this.x - about.x, this.y - about.y);
    const rotatedAboutOrigin = this.rotateAboutOrigin(reOriginAtOrigin, rads);
    const translatedBack = new Point(rotatedAboutOrigin.x + about.x, rotatedAboutOrigin.y + about.y);
    return translatedBack;
  }

  public translate(t: Vector2): Point {
      return new Point(this.x + t.x, this.y + t.y);
  }
}

export class Segment {
  public constructor(public readonly p: Point, public readonly q: Point) {}

  // http://www.jeffreythompson.org/collision-detection/line-line.php
  public intersectsSegment(b: Segment): boolean {
    const { p: { x: x1, y: y1 }, q: { x: x2, y: y2 } } = this;
    const { p: { x: x3, y: y3 }, q: { x: x4, y: y4 } } = b;

    const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
  }

  public intersectsPolygon(poly: Polygon): boolean {
    const collidingWithAnySegment = poly.getSegments().some((polySegment: Segment) =>
      this.intersectsSegment(polySegment));

    return collidingWithAnySegment;
  }

  public getCenter(): Point {
    return new Point((this.p.x + this.q.x) / 2, (this.p.y + this.q.y) / 2);
  }

  public recenterAt(point: Point): Segment {
    const center = this.getCenter();

    return new Segment(
      new Point(
        this.p.x - center.x + point.x,
        this.p.y - center.y + point.y,
      ),
      new Point(
        this.q.x - center.x + point.x,
        this.q.y - center.y + point.y,
      ),
    );
  }
}

export class Polygon {
  public constructor(public readonly points: Point[] = []) {}
  public intersectsSegment(segment: Segment): boolean {
    return segment.intersectsPolygon(this);
  }

  public getSegments(): Segment[] {
    const points = this.points;
    const L = points.length;

    return points.reduce((acc: Segment[], current: Point, index: number) => {
      const next: Point = points[(index + 1) % L];
      acc.push(new Segment(
        new Point(
          current.x,
          current.y,
        ),
        new Point(
          next.x,
          next.y,
        ),
      ));
      return acc;
    }, [] as Segment[]);
  }

  public intersectsPolygon(polygon: Polygon): boolean {
    return this.getSegments().some((s) => s.intersectsPolygon(polygon));
  }

  public rotate(rads: number): Polygon {
    const center = this.findCenter();

    return new Polygon(this.points.map((p) => p.rotateAboutPoint(rads, center)));
  }

  public computeBoundingBox() {
    const { points } = this;
    const minPoint = new Point(
      minimum(points, (a, b) => a.x - b.x).x,
      minimum(points, (a, b) => a.y - b.y).y,
    );
    const maxPoint = new Point(
      maximum(points, (a, b) => a.x - b.x).x,
      maximum(points, (a, b) => a.y - b.y).y,
    );

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

  public findCenter(): Point {
    const { points } = this;

    const boundingBoxMinPoint = new Point(
      minimum(points, (a, b) => a.x - b.x).x,
      minimum(points, (a, b) => a.y - b.y).y,
    );
    const boundingBoxMaxPoint = new Point(
      maximum(points, (a, b) => a.x - b.x).x,
      maximum(points, (a, b) => a.y - b.y).y,
    );

    const boundingBoxMidPoint = new Point(
      boundingBoxMinPoint.x + (boundingBoxMaxPoint.x - boundingBoxMinPoint.x) / 2,
      boundingBoxMinPoint.y + (boundingBoxMaxPoint.y - boundingBoxMinPoint.y) / 2,
    );

    return boundingBoxMidPoint;
  }
}

export class Rectangle {
  public constructor(public readonly min: Point, public readonly max: Point) {

  }

  public asPolygon(rect: Rectangle): Polygon {
    const { min, max } = rect;
    const minXMaxY = new Point(min.x, max.y);
    const maxXMinY = new Point(max.x, min.y);

    return new Polygon([minXMaxY, max, maxXMinY, min]);
  }
}


function minimum<T>(a: T[], comparator: (a: T, b: T) => number) {
  return a.reduce((min: T, current: T) => comparator(min, current) <= 0 ? min : current);
}

function maximum<T>(a: T[], comparator: (a: T, b: T) => number) {
  return a.reduce((max: T, current: T) => comparator(max, current) >= 0 ? max : current);
}
