export type ShutdownOptions = {
  destroy: () => Promise<void>
  gracePeriodMs: number
  /** Called when the drain overruns the grace period. */
  onForceExit: () => void
  /** Flipped as soon as a shutdown starts, so readiness probes fail fast. */
  onShutdownStart?: () => void
}

export type ShutdownController = {
  isShuttingDown: () => boolean
  shutdown: (signal: NodeJS.Signals) => Promise<void>
}

export function createShutdownController({
  destroy,
  gracePeriodMs,
  onForceExit,
  onShutdownStart
}: ShutdownOptions): ShutdownController {
  let shuttingDown = false
  let shutdownPromise: Promise<void> | null = null

  function forceExitAfterGracePeriod(): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      console.error(`[shutdown] did not complete within ${gracePeriodMs}ms; forcing process exit`)
      onForceExit()
    }, gracePeriodMs)
    timeout.unref()
    return timeout
  }

  function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (shutdownPromise) {
      return shutdownPromise
    }

    shuttingDown = true
    onShutdownStart?.()
    console.log(`[shutdown] received ${signal}; draining connections (grace=${gracePeriodMs}ms)`)

    shutdownPromise = (async () => {
      const forceExitTimer = forceExitAfterGracePeriod()
      try {
        await destroy()
        console.log('[shutdown] graceful shutdown completed')
      } finally {
        clearTimeout(forceExitTimer)
      }
    })()

    return shutdownPromise
  }

  return {
    isShuttingDown: () => shuttingDown,
    shutdown
  }
}

export function installSignalHandlers(
  controller: ShutdownController,
  exitProcess: (code: number) => void = (code) => process.exit(code)
): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGQUIT']

  signals.forEach((signal) => {
    process.on(signal, () => {
      void controller.shutdown(signal).then(
        () => {
          exitProcess(0)
        },
        (error: unknown) => {
          console.error('[shutdown] graceful shutdown failed:', error)
          exitProcess(1)
        }
      )
    })
  })
}
