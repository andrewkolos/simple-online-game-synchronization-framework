type Match<T> = {
  index: number;
  value: T;
  /**
   * The "distance" from the target, signed. We use the word "displacement" over "distance", since
   * distance does not measure direction.
   */
  displacementFromTarget: number;
}

type Comparator<A, T> = (o1: A, o2: T) => number;

export namespace Comparator {
  export const NUMBER = makeComparator("number");
  export const STRING = makeComparator("string"); 
}

export function binarySearch<A, T>(arr: A[], target: T, comparator: Comparator<A, T>): number | undefined {
  const closestMatch = binarySearchClosestMatch(arr, target, comparator);
  const matchFound = comparator(closestMatch.value, target) === 0;
  return  matchFound ? closestMatch.index : undefined;
}

/**
 * 
 * @param arr The array to search, most be sorted least to greatest. Will not be checked to make sure this criteria is satisfied.
 * @param target The value to search for (or the value closest to it).
 * @param comprator Function to determine the value of one element compared to another. 
 */
export function binarySearchClosestMatch<A, T>(arr: A[], target: T, comparator: Comparator<A, T>): {value: A, index: number} {
  if (arr == null || arr.length === 0) {
    throw Error(`Array is null, undefined, or empty. Value: ${arr}`);
  }

  let min = 0;
  let max = arr.length - 1;
  let i = halfwayIndex(min, max);

  let bestMatch: Match<A> = {
    index: i,
    value: arr[i],
    displacementFromTarget: Number.MAX_VALUE,
  };

  while (min <= max) {
    const currentValue = arr[i];
    const c = comparator(currentValue, target);

    if (Math.abs(c) < Math.abs(bestMatch.displacementFromTarget)) {
      bestMatch = {
        index: i,
        value: currentValue,
        displacementFromTarget: c,
      }
    }

    if (Math.sign(c) === 0) {
      return {
        value: currentValue,
        index: i,
      };
    } else if (Math.sign(c) < 0) {
      min = i + 1;
    } else {
      max = i - 1;
    }

    i = halfwayIndex(min, max);
  }

  return {
    index: bestMatch.index,
    value: bestMatch.value,
  };
}

function halfwayIndex(min: number, max: number) {
  return Math.floor(min + (max - min) / 2);
}

function makeComparator(type: "string"): (o1: string, o2: string) => number;
function makeComparator(type: "number"): (o1: number, o2: number) => number;
function makeComparator(type: "string" | "number") {
  if (type === "string") {
    return (o1: string, o2: string) => {
      for (let i = 0; i < o1.length; i++) {
        const c = o1.charCodeAt(i) - o2.charCodeAt(i);
        if (c != 0) {
          return c;
        }
      }
      return 0;
    }
  } else {
    return (o1: number, o2: number) => o1 - o2;
  }
}
