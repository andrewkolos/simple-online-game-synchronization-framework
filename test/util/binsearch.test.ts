import { binarySearchClosestMatch, Comparator } from 'src/util/binsearch';

describe(nameof(binarySearchClosestMatch), () => {
  it(`([1, 2, 3, 4], 2.4, Comparator.NUMBER)`, () => {
    expect(binarySearchClosestMatch([1, 2, 3, 4], 2.4, Comparator.NUMBER)).toEqual({ index: 1, value: 2 });
  });

  it(`([1, 2, 3, 4], 4, Comparator.NUMBER))`, () => {
    expect(binarySearchClosestMatch([1, 2, 3, 4], 4, Comparator.NUMBER)).toEqual({ index: 3, value: 4 });
  });
  
  it(`([1, 2, 3, 4], 3.3, Comparator.NUMBER))`, () => {
    expect(binarySearchClosestMatch([1, 2, 3, 4], 3.3, Comparator.NUMBER)).toEqual({ index: 2, value: 3 });
  });

  it(`([1, 2, 3, 4], 0.3, Comparator.NUMBER))`, () => {
    expect(binarySearchClosestMatch([1, 2, 3, 4], 0.3, Comparator.NUMBER)).toEqual({ index: 0, value: 1 });
  });

  it(`["a", "b", "c"], "b", Comparator.STRING))`, () => {
    expect(binarySearchClosestMatch(["a", "b", "c"], "b", Comparator.STRING)).toEqual({ index: 1, value: "b"});
  });

  it(`["a", "b", "c"], "d", Comparator.STRING))`, () => {
    expect(binarySearchClosestMatch(["a", "b", "c"], "d", Comparator.STRING)).toEqual({ index: 2, value: "c" });
  });

  it(`([], 1, (ol, o2) => o1 - o2)) => error`, () => {
    expect(() => binarySearchClosestMatch([], 1, Comparator.NUMBER)).toThrowError();
  })
});
