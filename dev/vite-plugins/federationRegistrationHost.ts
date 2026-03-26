// Vite plugin: host-side dev remote registry.
// Accepts periodic re-registration from remote dev servers,
// tracks them with TTL-based cleanup, and exposes them via plugin API.

import type { Plugin, ViteDevServer } from 'vite'

interface FederationRemote {
  id: string
  path: string
  metadata?: Record<string, unknown>
}

interface FederationRemoteRecord extends FederationRemote {
  lastSeen: number
}

interface FederationRegistrationHostOptions {
  path?: string
  ttl?: number
  cleanupInterval?: number
  onRemoteAdded?: (remote: FederationRemote, ctx: { server: ViteDevServer }) => void
  onRemoteUpdated?: (remote: FederationRemote, ctx: { server: ViteDevServer }) => void
  onRemoteRemoved?: (id: string, ctx: { server: ViteDevServer }) => void
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false

  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)
  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
      return false
  }
  return true
}

export function federationRegistrationHost({
  path = '/_dev/remotes',
  ttl = 15_000,
  cleanupInterval = 10_000,
  onRemoteAdded,
  onRemoteUpdated,
  onRemoteRemoved
}: FederationRegistrationHostOptions = {}) {
  const remotes = new Map<string, FederationRemoteRecord>()

  return {
    name: 'federation-registration-host',
    apply: 'serve',

    api: {
      getRemotes(): Map<string, FederationRemote> {
        const result = new Map<string, FederationRemote>()
        for (const [id, entry] of remotes) {
          result.set(id, {
            id: entry.id,
            path: entry.path,
            ...(entry.metadata && { metadata: entry.metadata })
          })
        }
        return result
      }
    },

    configureServer(server: ViteDevServer) {
      const ctx = { server }

      function fullReload() {
        server.environments.client.hot.send({ type: 'full-reload', path: '*' })
      }

      // TTL-based cleanup
      const interval = setInterval(() => {
        const now = Date.now()
        for (const [id, entry] of remotes) {
          if (now - entry.lastSeen > ttl) {
            remotes.delete(id)
            console.log(`[federation-registration] TTL expired, removed: ${id}`)
            if (onRemoteRemoved) {
              onRemoteRemoved(id, ctx)
            } else {
              fullReload()
            }
          }
        }
      }, cleanupInterval)
      server.httpServer?.on('close', () => clearInterval(interval))

      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith(path)) {
          return next()
        }

        // POST — register/update a remote
        if (request.url === path && request.method === 'POST') {
          let body = ''
          request.on('data', (chunk: Buffer) => (body += chunk))
          request.on('end', () => {
            try {
              const { id, path: remotePath, metadata } = JSON.parse(body)
              if (!id || !remotePath) {
                response.statusCode = 400
                response.end(JSON.stringify({ error: 'id and path required' }))
                return
              }

              const newData: FederationRemote = {
                id,
                path: remotePath,
                ...(metadata && { metadata })
              }
              const existing = remotes.get(id)

              if (!existing) {
                remotes.set(id, { ...newData, lastSeen: Date.now() })
                console.log(`[federation-registration] Added: ${id} -> ${remotePath}`)
                if (onRemoteAdded) {
                  onRemoteAdded(newData, ctx)
                } else {
                  fullReload()
                }
              } else {
                const existingData: FederationRemote = {
                  id: existing.id,
                  path: existing.path,
                  ...(existing.metadata && { metadata: existing.metadata })
                }
                existing.lastSeen = Date.now()

                if (!deepEqual(existingData, newData)) {
                  remotes.set(id, { ...newData, lastSeen: Date.now() })
                  console.log(`[federation-registration] Updated: ${id} -> ${remotePath}`)
                  if (onRemoteUpdated) {
                    onRemoteUpdated(newData, ctx)
                  } else {
                    fullReload()
                  }
                }
              }

              response.statusCode = 200
              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify({ ok: true }))
            } catch {
              response.statusCode = 400
              response.end(JSON.stringify({ error: 'invalid JSON' }))
            }
          })
          return
        }

        // GET — list registered remotes (debug)
        if (request.url === path && request.method === 'GET') {
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json')
          response.end(
            JSON.stringify(Array.from(remotes.values(), ({ lastSeen, ...rest }) => rest))
          )
          return
        }

        next()
      })
    }
  } satisfies Plugin
}
