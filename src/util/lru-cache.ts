class Node<K, V> {
  public prev?: Node<K, V>;
  public next?: Node<K, V>;
  public constructor(public readonly key: K, public value: V) { }
}

export class LruCache<K, V> {

  private readonly cacheElements: Map<K, Node<K, V>> = new Map();
  private head?: Node<K, V>;
  private tail?: Node<K, V>; // Node that is about to fall out of cache.

  public constructor(private readonly capacity: number) { }

  public set(key: K, value: V): void {
    const old = this.cacheElements.get(key);
    if (old != undefined) {
      old.value = value;
      this.moveToHead(old);
    } else {
      const newNode = new Node(key, value);

      if (this.cacheElements.size >= this.capacity) {
        this.removeTail();
      }

      this.putAsHead(newNode);

      this.cacheElements.set(key, newNode);
    }
  }

  public get(key: K): V | undefined {
    const node = this.cacheElements.get(key);

    if (node == null) return undefined;

    this.moveToHead(node);
    return node.value;
  }

  public forEach(fn: (value: V, key: K) => void) {
    this.cacheElements.forEach((node: Node<K, V>, key: K) => {
      fn(node.value, key);
    });
  }

  /** @override */
  public toString() {
    let str = '';
    let current = this.tail;
    while (current != null) {
      str += ` [${current.key}, ${current.value}],`;
      current = current.prev;
    }
    str = str.substr(1, str.length - 2); // Remove space at beginning and comma at end;
    return `[${str}]`;
  }

  private removeTail(): void {
    if (this.tail == null) throw new Error('Tail is undefined.');

    this.cacheElements.delete(this.tail.key);

    this.tail = this.tail.prev;
    if (this.tail != null) {
      this.tail.next = undefined;
    }
  }

  private moveToHead(node: Node<K, V>) {
    if (node === this.head) return;

    if (node.prev != null) {
      node.prev.next = node.next;
    }

    if (node.next != null) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    this.putAsHead(node);
  }

  private putAsHead(node: Node<K, V>) {
    node.next = this.head;
    node.prev = undefined;
    if (this.head != null) {
      this.head.prev = node;
    }

    this.head = node;

    if (this.tail == null) {
      this.tail = this.head;
    }
  }
}
