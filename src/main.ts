/**
 * Represents a three-dimensional vector (i.e. displacement).  
 */
export class Vector3 {

  /**
   * Creates a vector with x, y, and z values set to 0.
   */
  constructor()
  /**
   * Creates a vector.
   * @param scalar - The scalar value for x, y, and z. Default is 0.
   */
  constructor(scalar: number)
  /**
   * Creates a vector.
   * @param x - The x value of the vector. Default is 0.
   * @param y - The y value of the vector. Default is 0.
   * @param z - The z value of the vector. Default is 0.
   */
  constructor(x: number, y: number, z: number)
  constructor(pubic x = 0, public y = 0, public z = 0) { }


  /**
   * Creates a clone of this vector, with optionally changed values.
   */
  cloneWithValues({ x = this.x, y = this.y, z = this.z }) {
    return new Vector3(x, y, z);
  }

  add(vector: Vector3): Vector3;
  add(scalar: number): Vector3;
  add(x: number, y: number, z: number): Vector3;
  add(var1: Vector3 | number, y?: number, z?: number): Vector3 {
    if (var1 instanceof Vector3) {
      return new Vector3(this.x + var1.x, this.y + var1.y, this.z + var1.z);
    } else if (typeof var1 === "number") {
      if (y != null) {
        return new Vector3(this.x + var1, this.y + y, this.z + z);
      } else {
        return new Vector3(this.x + var1, this.y + var1, this.z + var1)
      }
    } else {
      throw new TypeError("Expected number or vector but got " + typeof var1);
    }
  }

  equals(vector: Vector3): boolean {
    return this.x === vector.x && this.y === vector.y && this.z === vector.z
  }

  addScaledVector(vector: Vector3, scalar: number) {
    return this.add(vector.add()
  }
}

(new Vector3(1, 2, 3)).cloneWithValues({ x: 4 })