interface CacheEntry<T> {
  data: T
  timestamp: number
}

class DataCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private cacheDuration = 5000

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const now = Date.now()
    if (now - entry.timestamp > this.cacheDuration) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    const now = Date.now()
    if (now - entry.timestamp > this.cacheDuration) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
}

export const dataCache = new DataCache()
