export type DeepReadonly<T> =
  T extends Array<infer R> ? DeepReadonlyArray<R> :
  T extends Function ? T :
  T extends object ? DeepReadonlyObject<T> :
  T;

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> { }

export type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

/**
 * Generates an interface type from another type. Can be useful for exporting the type
 * of a class, but not it's constructor.
 */
export type Interface<T> = { [P in keyof T]: T[P] };

export type ValueOf<T> = T[keyof T];

export function fromMapGetOrDefault<K, V>(map: Map<K, V>, key: K, defaultV: V) {
  const value = map.get(key);
  return value == null ? defaultV : value;
}

/**
 * Takes a value and it returns it as a single-value array if is not already an
 * array. Otherwise, if the value is already an array, gives it back unchanged.
 * @param item The value to turn into an array, if not already one.
 * @returns The value wrapped in a single-item array or itself it was already an array.
 */
export function arrayify<T>(item: T | T[]): T[] {
  return Array.isArray(item) ? item : [item];
}
