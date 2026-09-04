import { Server } from '@hocuspocus/server'
import { parsePositiveInt } from './lib/env.ts'
import { createHooks } from './lib/hooks.ts'
import { createShutdownController, installSignalHandlers } from './lib/shutdown.ts'

const opencloudUrl = (process.env.OPENCLOUD_URL ?? '').replace(/\/$/, '')

let isServerReady = false

if (!opencloudUrl) {
  console.error('OPENCLOUD_URL is required, e.g. https://cloud.example.com')
  process.exit(1)
}

let port: number
let SHUTDOWN_GRACE_PERIOD_MS: number
try {
  port = parsePositiveInt('PORT', 1234)
  SHUTDOWN_GRACE_PERIOD_MS = parsePositiveInt('SHUTDOWN_GRACE_PERIOD_MS', 15000)
} catch (e: unknown) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

const shutdownController = createShutdownController({
  destroy: () => server.destroy(),
  gracePeriodMs: SHUTDOWN_GRACE_PERIOD_MS,
  onForceExit: () => process.exit(1),
  onShutdownStart: () => {
    isServerReady = false
  }
})

const hooks = createHooks({
  opencloudUrl,
  lifecycle: {
    isReady: () => isServerReady,
    isShuttingDown: () => shutdownController.isShuttingDown()
  }
})

const server = new Server({
  port,
  address: '0.0.0.0',
  stopOnSignals: false,
  ...hooks
})

installSignalHandlers(shutdownController)

server.listen().then(
  () => {
    isServerReady = true
    console.log(`yjs server listening on :${port}, oc=${opencloudUrl}`)
  },
  (err: unknown) => {
    isServerReady = false
    // Most often the port is already taken. Without this the process died on an
    // unhandled rejection and a stack trace instead of saying what went wrong.
    console.error(`yjs server failed to listen on :${port}:`, err)
    process.exit(1)
  }
)
