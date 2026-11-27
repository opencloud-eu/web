import { LoadingService } from '../../../src/services/loadingService'

describe('LoadingService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds a task and sets it inactive initially', () => {
    const service = new LoadingService()
    const action = new Promise((resolve) => {
      resolve(true)
    })

    service.addTask(() => action)
    expect(service.isLoading).toBeFalsy()
  })
  it('adds a task and sets it active after the debounce', () => {
    const service = new LoadingService()
    const action = new Promise((resolve) => {
      resolve(true)
    })

    service.addTask(() => action)
    vi.runAllTimers()
    expect(service.isLoading).toBeTruthy()
  })
  it('removes a task after being finished', async () => {
    const service = new LoadingService()
    const action = new Promise((resolve) => {
      resolve(true)
    })

    await service.addTask(() => action)
    vi.runAllTimers()
    expect(service.isLoading).toBeFalsy()
  })
  it('never shows a task that finished before its debounce', async () => {
    const service = new LoadingService()

    await service.addTask(() => Promise.resolve(true))
    vi.runAllTimers()

    expect(service.isLoading).toBeFalsy()
  })
  describe('minDuration', () => {
    function startTask(service: LoadingService) {
      let finish: () => void
      const task = service.addTask(() => new Promise<void>((resolve) => (finish = resolve)), {
        debounceTime: 0,
        minDuration: 1000
      })
      vi.advanceTimersByTime(0)
      return { task, finish: () => finish() }
    }

    it('keeps a fast task shown for its minimum duration', async () => {
      const service = new LoadingService()
      const { task, finish } = startTask(service)
      vi.advanceTimersByTime(200)

      finish()
      await task
      expect(service.isLoading).toBeTruthy()

      vi.advanceTimersByTime(799)
      expect(service.isLoading).toBeTruthy()
      vi.advanceTimersByTime(1)
      expect(service.isLoading).toBeFalsy()
    })
    it('resolves the task right away, not after the minimum duration', async () => {
      const service = new LoadingService()
      const resolved = vi.fn()
      const { task, finish } = startTask(service)

      void task.then(resolved)
      finish()
      await task

      expect(resolved).toHaveBeenCalled()
      expect(service.isLoading).toBeTruthy()
    })
    it('removes a task that ran longer than the minimum duration right away', async () => {
      const service = new LoadingService()
      const { task, finish } = startTask(service)
      vi.advanceTimersByTime(3000)

      finish()
      await task

      expect(service.isLoading).toBeFalsy()
    })
  })
  it('warns before unload while a task is running', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const service = new LoadingService()

    const task = service.addTask(() => Promise.resolve(true))
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    await task
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })
  it('does not warn before unload when a task opts out', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const service = new LoadingService()

    await service.addTask(() => Promise.resolve(true), { warnBeforeUnload: false })
    expect(addSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })
  it('keeps warning while a warning task remains after an opted-out task finished', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const service = new LoadingService()

    let finishWarning: (value: boolean) => void
    const warning = service.addTask(
      () =>
        new Promise<boolean>((resolve) => {
          finishWarning = resolve
        })
    )
    await service.addTask(() => Promise.resolve(true), { warnBeforeUnload: false })
    expect(removeSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function))

    finishWarning(true)
    await warning
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })
  it('returns the current progress of a running task', () => {
    const service = new LoadingService()
    const expectedResult = {
      1: 25,
      2: 50,
      3: 75,
      4: 100
    }

    service.addTask(
      ({ setProgress }) => {
        const promises: Promise<void>[] = []
        const actions = [1, 2, 3, 4] as const
        for (const action of actions) {
          promises.push(
            new Promise((resolve) => {
              resolve(true)
            }).then(() => {
              setProgress({ total: actions.length, current: action })
              expect(service.currentProgress).toBe(expectedResult[action])
            })
          )
        }
        return Promise.all(promises)
      },
      { indeterminate: false }
    )
    vi.runAllTimers()
  })
})
