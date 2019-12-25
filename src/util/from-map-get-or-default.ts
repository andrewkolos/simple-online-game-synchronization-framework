export function fromMapGetOrDefault<K, V>(map: Map<K, V>, key: K, defaultV: V | (() => V) ) {
  const value = map.get(key);
  if (value != null) {
    return value;
  }
  const defaultValue = defaultV instanceof Function ? defaultV() : defaultV;
  map.set(key, defaultValue);
  return defaultValue;
}
