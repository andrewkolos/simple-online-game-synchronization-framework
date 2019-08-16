export class DefaultMap<K, V> extends Map<K, V> {

  public constructor(private readonly defaultFactory: () => V) {
    super();
  }

  public get(key: K): V {
    const value = super.get(key);
    if (value == null) {
      const defaultValue = this.defaultFactory();
      super.set(key, defaultValue);
      return defaultValue;
    }

    return value;
  }
}
