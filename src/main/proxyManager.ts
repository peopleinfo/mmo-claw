export interface ProxyEndpoint {
  id: string
  url: string
  healthy: boolean
  lastUsed?: number
}

export class ProxyManager {
  private readonly proxies = new Map<string, ProxyEndpoint>()
  private nextIndex = 0

  list(): ProxyEndpoint[] {
    return [...this.proxies.values()]
  }

  add(url: string): ProxyEndpoint {
    const normalized = normalizeProxy(url)
    if (!normalized) {
      throw new Error(`Invalid proxy URL: ${url}`)
    }

    const existing = [...this.proxies.values()].find((proxy) => proxy.url === normalized)
    if (existing) {
      return existing
    }

    const proxy: ProxyEndpoint = {
      id: createId(normalized),
      url: normalized,
      healthy: true,
    }
    this.proxies.set(proxy.id, proxy)
    return proxy
  }

  remove(id: string): void {
    this.proxies.delete(id)
  }

  next(): ProxyEndpoint | null {
    const healthy = [...this.proxies.values()].filter((proxy) => proxy.healthy)
    if (healthy.length === 0) {
      return null
    }

    const index = this.nextIndex % healthy.length
    this.nextIndex += 1
    const pick = healthy[index]
    pick.lastUsed = Date.now()
    return pick
  }

  setHealth(id: string, healthy: boolean): void {
    const proxy = this.proxies.get(id)
    if (!proxy) {
      return
    }
    proxy.healthy = healthy
  }
}

function normalizeProxy(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:', 'socks5:'].includes(parsed.protocol)) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

function createId(url: string): string {
  return Buffer.from(url).toString('base64url').slice(0, 16)
}
