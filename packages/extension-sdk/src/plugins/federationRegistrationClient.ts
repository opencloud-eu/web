import type { Plugin, ViteDevServer } from 'vite'
import https from 'https'
import http from 'http'
import { watch, type FSWatcher } from 'fs'

interface DevFetchResponse {
  ok: boolean
  status: number | undefined
  data: string
}

/**
 * Minimal fetch helper that accepts self-signed certificates (no extra deps).
 */
function devFetch(
  url: string,
  { method = 'GET', body }: { method?: string; body?: string } = {}
): Promise<DevFetchResponse> {
  return new Promise((resolve, reject) => {
    const mod = new URL(url).protocol === 'https:' ? https : http
    const req = mod.request(url, { method, rejectUnauthorized: false }, (res) => {
      let data = ''
      res.on('data', (chunk: string) => (data += chunk))
      res.on('end', () =>
        resolve({
          ok: res.statusCode! >= 200 && res.statusCode! < 300,
          status: res.statusCode,
          data
        })
      )
    })
    req.on('error', reject)
    if (body) {
      req.setHeader('Content-Type', 'application/json')
      req.write(body)
    }
    req.end()
  })
}

interface FederationRegistrationClientOptions {
  /** Host dev server URL (e.g. 'https://host.docker.internal:9201') */
  hostUrl: string
  /** Remote ID used for registration */
  name: string
  /** Remote entry filename (e.g. 'remoteEntry.mjs'), combined with the server address to form the full URL */
  entryPoint: string
  /** Returns optional metadata to send with registration */
  getMetadata?: () => Record<string, unknown> | undefined
  /** Re-registration interval in ms (default: 5000) */
  interval?: number
  /** Host endpoint path (default: '/_dev/remotes') */
  path?: string
  /** File paths to watch for immediate re-registration on metadata change */
  metadataWatchFiles?: string[]
}

/**
 * Vite plugin: remote-side periodic registration with a host dev server.
 * Sends registration data at a fixed interval so the host always knows
 * about this remote, even after the host restarts.
 */
export function federationRegistrationClient({
  hostUrl,
  name,
  entryPoint,
  getMetadata,
  interval = 5_000,
  path = '/_dev/remotes',
  metadataWatchFiles = []
}: FederationRegistrationClientOptions): Plugin {
  return {
    name: 'federation-registration-client',
    apply: 'serve',

    configureServer(server: ViteDevServer) {
      // Skip registration during test runs (Vitest uses serve mode internally)
      if (server.config.mode === 'test') return

      let registrationInterval: ReturnType<typeof setInterval> | null = null
      let entryPointUrl = ''
      const watchers: FSWatcher[] = []

      async function register() {
        if (!entryPointUrl) return

        const metadata = getMetadata?.()
        const url = `${hostUrl}${path}`
        try {
          const res = await devFetch(url, {
            method: 'POST',
            body: JSON.stringify({
              id: name,
              path: entryPointUrl,
              ...(metadata && { metadata })
            })
          })
          if (!res.ok) {
            console.warn(`[federation-registration] Registration failed: ${res.status}`)
          }
        } catch {
          // Host is likely down — will retry on next interval
        }
      }

      server.httpServer?.on('listening', () => {
        const address = server.httpServer.address()
        const port = typeof address === 'object' ? address?.port : address
        const hostname =
          typeof server.config.server.host === 'string' ? server.config.server.host : 'localhost'
        entryPointUrl = `https://${hostname}:${port}/${entryPoint}`

        register()
        registrationInterval = setInterval(register, interval)

        // Watch files for immediate re-registration on metadata change
        for (const filePath of metadataWatchFiles) {
          try {
            const watcher = watch(filePath, { persistent: false }, () => {
              console.log(`[federation-registration] ${filePath} changed, re-registering...`)
              register()
            })
            watchers.push(watcher)
          } catch {
            // File may not exist yet — that's fine
          }
        }
      })

      server.httpServer?.on('close', () => {
        if (registrationInterval) {
          clearInterval(registrationInterval)
          registrationInterval = null
        }
        for (const watcher of watchers) {
          watcher.close()
        }
      })
    }
  } satisfies Plugin
}
