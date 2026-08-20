class CacheElement<T> {
  public value: T
  public expires: number

  constructor(value: T, ttl: number) {
    this.value = value
    this.expires = ttl ? new Date().getTime() + ttl : 0
  }

  get expired(): boolean {
    return this.expires > 0 && this.expires < new Date().getTime()
  }
}

interface CacheOptions<K, V> {
  ttl?: number
  capacity?: number

  /**
   * Called whenever an entry leaves the cache. `replacedValue` is the value that
   * left, `value` the new one for that key, set only on replacement.
   */
  onEvict?: (event: { key: K; replacedValue: V; value?: V }) => void
}

export default class Cache<K, V> {
  private map: Map<K, CacheElement<V>>
  private readonly ttl: number
  private readonly capacity: number
  private readonly onEvict?: (event: { key: K; replacedValue: V; value?: V }) => void

  constructor(options: CacheOptions<K, V>) {
    this.ttl = options.ttl || 0
    this.capacity = options.capacity || 0
    this.onEvict = options.onEvict

    this.map = new Map<K, CacheElement<V>>()
  }

  public set(key: K, value: V, ttl?: number): V {
    const existing = this.map.get(key)
    this.map.set(key, new CacheElement<V>(value, isNaN(ttl) ? this.ttl : ttl))

    if (existing) {
      this.onEvict?.({ key, replacedValue: existing.value, value })
    }

    this.evict()

    return value
  }

  public get(key: K): V {
    this.evict()
    const entry = this.map.get(key)

    if (entry) {
      return entry.value
    }
  }

  public delete(key: K): boolean {
    const entry = this.map.get(key)
    const deleted = this.map.delete(key)

    if (deleted) {
      this.onEvict?.({ key, replacedValue: entry.value })
    }

    return deleted
  }

  public clear(): void {
    if (this.onEvict) {
      this.map.forEach((entry, key) => this.onEvict({ key, replacedValue: entry.value }))
    }

    return this.map.clear()
  }

  public entries(): [K, V][] {
    this.evict()
    return [...this.map.entries()].map((kv) => [kv[0], kv[1].value])
  }

  public keys(): K[] {
    this.evict()
    return [...this.map.keys()]
  }

  public has(key: K): boolean {
    this.evict()
    return this.map.has(key)
  }

  public values(): V[] {
    this.evict()
    return [...this.map.values()].map((e) => e.value)
  }

  public evict(): void {
    this.map.forEach((mv, mk) => {
      if (mv.expired) {
        this.delete(mk)
      }
    })

    if (!this.capacity) {
      return
    }

    for (const [k] of [...this.map.entries()]) {
      if (this.map.size <= this.capacity) {
        break
      }

      this.delete(k)
    }
  }
}
