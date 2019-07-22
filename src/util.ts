export type DeepReadonly<T> =
  T extends (infer R)[] ? DeepReadonlyArray<R> :
  T extends Function ? T :
  T extends object ? DeepReadonlyObject<T> :
  T;

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> { }

export type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export type ValueOf<T> = T[keyof T];

export function compareDumbObjects<T>(o1: T, o2: T) {
  const isDumbObject = Object.values(o1).every((value: any) => {
    const t = typeof value;
    
    return t !== "object" && t !== "function";
  });

  if (!isDumbObject) {
    throw Error("Object cannot contain non-value types.");
  }

  return JSON.stringify(o1) === JSON.stringify(o2);
}

/**
 * Removes new lines and indentation from a multi-line template string.
 * @param strings The string parts of a template string.
 * @param values The value (${}) parts of a template string.
 * @returns The template string with all whitespace removed.
 */
export function singleLineify(strings: TemplateStringsArray, ...values: string[]) {
  // Interweave the strings with the
  // substitution vars first.
  let output = '';
  for (let i = 0; i < values.length; i += 1) {
    output += strings[i] + values[i];
  }
  output += strings[values.length];

  // Split on newlines.
  const lines = output.split(/(?:\r\n|\n|\r)/);

  // Rip out the leading whitespace.
  return lines.map((line) => {
    return line.replace(/^\s+/gm, '');
  }).join(' ').trim();
}

export function fromMapGetOrDefault<K, V>(map: Map<K,V>, key: K, defaultV: V) {
  const value = map.get(key);
  return value == null ? defaultV : value;
}