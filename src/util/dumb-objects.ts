/**
 * Checks value-equality for any two objects. Neither object may contain
 * a function as a value.
 * @param o1 The first object.
 * @param o2 The second object.
 */
export function compareDumbObjects<T>(o1: T, o2: T) {
  isDumbObjectUnsafe(o1);
  isDumbObjectUnsafe(o2);
  return JSON.stringify(sortObject(o1)) === JSON.stringify(sortObject(o2));
}

function sortObject(object: any) {
  const sortedObj = {} as any;
  const keys = Object.keys(object);

  keys.sort((key1, key2) => {
    // tslint:disable-next-line: no-parameter-reassignment
    key1 = key1.toLowerCase(), key2 = key2.toLowerCase();
    if (key1 < key2) return -1;
    if (key1 > key2) return 1;
    return 0;
  });

  for (const index in keys) {
    if (!object.hasOwnProperty(index)) continue;
    const key = keys[index];
    if (typeof object[key] == 'object' && !(object[key] instanceof Array)) {
      sortedObj[key] = sortObject(object[key]);
    } else {
      sortedObj[key] = object[key];
    }
  }

  return sortedObj;
}

/**
 * Checks that every value within an object is not a function.
 * @param o The object to check.
 */
function isDumbObject(o: Object): boolean {
  return Object.values(o).every((value: any) => {
    const t = typeof value;
    return t !== 'function';
  });
}

/**
 * Checks that every value within an object is not a function,
 * throwing an Error if this is not the case.
 * @param o The object to check.
 */
function isDumbObjectUnsafe(o: Object): void | never {
  if (!isDumbObject(o)) {
    throw Error('Object cannot contain non-value types.');
  }
}

/**
 * Clones an object. None of the properties of the object may be a function.
 * @param o The object to clone.
 */
export function cloneDumbObject<T>(o: T): T {
  if (o == null)
    return o;
  isDumbObjectUnsafe(o);
  return JSON.parse(JSON.stringify(o));
}
