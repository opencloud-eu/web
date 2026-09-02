import { createShutdownController, installSignalHandlers } from '../../../src/lib/shutdown.ts'

const GRACE_MS = 15000

function getController(overrides: Partial<Parameters<typeof createShutdownController>[0]> = {}) {
  const destroy = vi.fn().mockResolvedValue(undefined)
  const onForceExit = vi.fn()
  const onShutdownStart = vi.fn()
  const controller = createShutdownController({
    destroy,
    gracePeriodMs: GRACE_MS,
    onForceExit,
    onShutdownStart,
    ...overrides
  })
  return { controller, destroy, onForceExit, onShutdownStart }
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('createShutdownController', () => {
  it('starts out running', () => {
    expect(getController().controller.isShuttingDown()).toBe(false)
  })

  it('destroys the server and flags the shutdown', async () => {
    const { controller, destroy, onShutdownStart } = getController()

    await controller.shutdown('SIGTERM')

    expect(destroy).toHaveBeenCalledOnce()
    expect(onShutdownStart).toHaveBeenCalledOnce()
    expect(controller.isShuttingDown()).toBe(true)
  })

  it('flags the shutdown before the drain finishes', async () => {
    let resolveDestroy = (): void => {}
    const destroy = vi.fn(() => new Promise<void>((resolve) => (resolveDestroy = resolve)))
    const { controller } = getController({ destroy })

    const pending = controller.shutdown('SIGTERM')
    expect(controller.isShuttingDown()).toBe(true)

    resolveDestroy()
    await pending
  })

  it('destroys only once for repeated signals', async () => {
    const { controller, destroy } = getController()

    const first = controller.shutdown('SIGTERM')
    const second = controller.shutdown('SIGINT')

    expect(second).toBe(first)
    await Promise.all([first, second])
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('forces an exit when the drain overruns the grace period', async () => {
    vi.useFakeTimers()
    const { controller, onForceExit } = getController({
      destroy: () => new Promise<void>(() => {})
    })

    void controller.shutdown('SIGTERM')
    expect(onForceExit).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(GRACE_MS)
    expect(onForceExit).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('clears the force-exit timer once the drain completes', async () => {
    vi.useFakeTimers()
    const { controller, onForceExit } = getController()

    await controller.shutdown('SIGTERM')
    await vi.advanceTimersByTimeAsync(GRACE_MS * 2)

    expect(onForceExit).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('rejects and clears the timer when the drain fails', async () => {
    vi.useFakeTimers()
    const { controller, onForceExit } = getController({
      destroy: vi.fn().mockRejectedValue(new Error('destroy failed'))
    })

    await expect(controller.shutdown('SIGTERM')).rejects.toThrow('destroy failed')
    await vi.advanceTimersByTimeAsync(GRACE_MS * 2)

    expect(onForceExit).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('installSignalHandlers', () => {
  afterEach(() => {
    ;(['SIGTERM', 'SIGINT', 'SIGQUIT'] as NodeJS.Signals[]).forEach((signal) => {
      process.removeAllListeners(signal)
    })
  })

  it.each(['SIGTERM', 'SIGINT', 'SIGQUIT'] as NodeJS.Signals[])(
    'shuts down and exits with 0 on %s',
    async (signal) => {
      const exitProcess = vi.fn()
      const controller = {
        isShuttingDown: () => false,
        shutdown: vi.fn().mockResolvedValue(undefined)
      }
      installSignalHandlers(controller, exitProcess)

      process.emit(signal)
      await vi.waitFor(() => expect(exitProcess).toHaveBeenCalledWith(0))
      expect(controller.shutdown).toHaveBeenCalledWith(signal)
    }
  )

  it('exits with 1 when the shutdown fails', async () => {
    const exitProcess = vi.fn()
    const controller = {
      isShuttingDown: () => false,
      shutdown: vi.fn().mockRejectedValue(new Error('nope'))
    }
    installSignalHandlers(controller, exitProcess)

    process.emit('SIGTERM')
    await vi.waitFor(() => expect(exitProcess).toHaveBeenCalledWith(1))
  })
})
