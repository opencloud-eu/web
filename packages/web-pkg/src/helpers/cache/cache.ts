class CacheElement<T> {
  public value: T
  public expires: number
  public size: number

  constructor(value: T, ttl: number, size = 0) {
    this.value = value
    this.expires = ttl ? new Date().getTime() + ttl : 0
    this.size = size
  }

  get expired(): boolean {
    return this.expires > 0 && this.expires < new Date().getTime()
  }
}

interface CacheOptions<K, V> {
  ttl?: number

  /**
   * Maximum number of entries. Exceeding it drops the least recently used ones.
   */
  capacity?: number

  /**
   * Byte budget across all entries. Only has an effect together with `sizeOf`.
   */
  maxBytes?: number

  /**
   * Byte cost of a value, used for the `maxBytes` budget.
   */
  sizeOf?: (value: V) => number

  /**
   * Called whenever an entry leaves the cache. `replacedValue` is the value that
   * left, `value` the new one for that key, set only on replacement.
   */
  onEvict?: (event: { key: K; replacedValue: V; value?: V }) => void
}

export default class Cache<K, V> {
  private map: Map<K, CacheElement<V>>
  private totalBytes: number
  private readonly ttl: number
  private readonly capacity: number
  private readonly maxBytes: number
  private readonly sizeOf?: (value: V) => number
  private readonly onEvict?: (event: { key: K; replacedValue: V; value?: V }) => void

  constructor(options: CacheOptions<K, V>) {
    this.ttl = options.ttl || 0
    this.capacity = options.capacity || 0
    this.maxBytes = options.maxBytes || 0
    this.sizeOf = options.sizeOf
    this.onEvict = options.onEvict

    this.map = new Map<K, CacheElement<V>>()
    this.totalBytes = 0
  }

  /**
   * Byte cost of all entries, as reported by `sizeOf`.
   */
  public get bytes(): number {
    return this.totalBytes
  }

  public set(key: K, value: V, ttl?: number): V {
    const existing = this.map.get(key)
    if (existing) {
      this.drop(key, existing)
    }

    const element = new CacheElement<V>(
      value,
      isNaN(ttl) ? this.ttl : ttl,
      this.sizeOf?.(value) || 0
    )
    this.map.set(key, element)
    this.totalBytes += element.size

    if (existing) {
      this.onEvict?.({ key, replacedValue: existing.value, value })
    }

    this.trim()

    return value
  }

  public get(key: K): V {
    const entry = this.map.get(key)

    if (!entry) {
      return
    }

    if (entry.expired) {
      this.delete(key)
      return
    }

    this.touch(key, entry)

    return entry.value
  }

  public delete(key: K): boolean {
    const entry = this.map.get(key)

    if (!entry) {
      return false
    }

    this.drop(key, entry)
    this.onEvict?.({ key, replacedValue: entry.value })

    return true
  }

  public clear(): void {
    if (this.onEvict) {
      this.map.forEach((entry, key) => this.onEvict({ key, replacedValue: entry.value }))
    }

    this.map.clear()
    this.totalBytes = 0
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
    const entry = this.map.get(key)

    if (entry?.expired) {
      this.delete(key)
      return false
    }

    return !!entry
  }

  public values(): V[] {
    this.evict()
    return [...this.map.values()].map((e) => e.value)
  }

  /**
   * Drops all expired entries. This is only needed before handing out the whole
   * content of the cache.
   */
  public evict(): void {
    this.map.forEach((entry, key) => {
      if (entry.expired) {
        this.delete(key)
      }
    })

    this.trim()
  }

  private drop(key: K, entry: CacheElement<V>): void {
    this.map.delete(key)
    this.totalBytes -= entry.size
  }

  /**
   * Moves an entry to the end of the map, where the most recently used ones live.
   */
  private touch(key: K, entry: CacheElement<V>): void {
    this.map.delete(key)
    this.map.set(key, entry)
  }

  /**
   * Evicts least recently used entries until capacity and byte budget are met.
   */
  private trim(): void {
    if (!this.capacity && !this.maxBytes) {
      return
    }

    for (const key of this.map.keys()) {
      const overCapacity = this.capacity && this.map.size > this.capacity
      const overBudget = this.maxBytes && this.totalBytes > this.maxBytes

      if (!overCapacity && !overBudget) {
        return
      }

      this.delete(key)
    }
  }
}
