import { LruCache } from '../../src/util/lru-cache';

describe(nameof(LruCache), () => {
  it('correctly generates a string representation', () => {
    const cache: LruCache<number, string> = new LruCache(Number.MAX_SAFE_INTEGER);
    cache.set(1, 'a');
    cache.set(2, 'b');
    cache.set(3, 'c');
    expect(cache.toString()).toEqual('[[1, a], [2, b], [3, c]]');
  });

  it('correctly stores a single value', () => {
    const cache: LruCache<number, string> = new LruCache(Number.MAX_SAFE_INTEGER);
    cache.set(1, 'hi');
    expect(cache.get(1)).toEqual('hi');
  });

  it('correctly eliminates tail value when over capacity', () => {
    const cache: LruCache<number, string> = new LruCache(3);
    cache.set(1, 'a');
    cache.set(2, 'b');
    cache.set(3, 'c');
    cache.set(4, 'd');
    expect(cache.get(1)).toBeUndefined();
  });

  it('moves entry to most recently used position when accessed', () => {
    const cache: LruCache<number, string> = new LruCache(3);
    cache.set(1, 'a');
    cache.set(2, 'b');
    cache.set(3, 'c');
    cache.get(1);
    cache.set(4, 'd');
    expect(cache.toString()).toEqual('[[3, c], [1, a], [4, d]]');
  });
});
