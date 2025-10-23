import { VisibilityObserver } from '../../../src/observer'

let callback: (
  arg: { isIntersecting: boolean; intersectionRatio: number; target: HTMLElement }[]
) => void

const observeMock = vi.fn()
const unobserveMock = vi.fn()
const reset = () => {
  window.IntersectionObserver = vi.fn(
    class {
      constructor(cb: typeof callback) {
        callback = cb
      }
      observe = observeMock
      unobserve = unobserveMock
      disconnect = vi.fn()
    }
  ) as any
}

beforeEach(reset)

window.document.body.innerHTML = `<div id="target">foo</div>`

describe('VisibilityObserver', () => {
  it.each([
    { onEnter: vi.fn() },
    { onExit: vi.fn() },
    {
      onEnter: vi.fn(),
      onExit: vi.fn()
    },
    {}
  ])('observes %s', (cb) => {
    const observer = new VisibilityObserver()
    observer.observe(document.getElementById('target'), cb)
    expect(observeMock).toHaveBeenCalledTimes(Object.keys(cb).length ? 1 : 0)
  })

  it('handles entered and exited callbacks', () => {
    const onEnter = vi.fn()
    const onExit = vi.fn()
    const observer = new VisibilityObserver()
    const target = document.getElementById('target')
    observer.observe(target, { onEnter, onExit })
    callback([{ isIntersecting: false, intersectionRatio: -1, target }])
    expect(onEnter).toHaveBeenCalledTimes(0)
    expect(onExit).toHaveBeenCalledTimes(0)
    callback([{ isIntersecting: true, intersectionRatio: 1, target }])
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(0)
    callback([{ isIntersecting: false, intersectionRatio: -1, target }])
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)
    callback([{ isIntersecting: true, intersectionRatio: 1, target }])
    expect(onEnter).toHaveBeenCalledTimes(2)
    expect(onExit).toHaveBeenCalledTimes(1)
    callback([{ isIntersecting: false, intersectionRatio: -1, target }])
    expect(onEnter).toHaveBeenCalledTimes(2)
    expect(onExit).toHaveBeenCalledTimes(2)
  })

  it.each(['disconnect', 'unobserve'] as const)('handles %s', (m) => {
    const onEnter = vi.fn()
    const onExit = vi.fn()
    const observer = new VisibilityObserver()
    const target = document.getElementById('target')
    observer.observe(target, { onEnter, onExit })
    observer[m](target)
    callback([{ isIntersecting: false, intersectionRatio: -1, target }])
    expect(onEnter).toHaveBeenCalledTimes(0)
    expect(onExit).toHaveBeenCalledTimes(0)
    callback([{ isIntersecting: true, intersectionRatio: 1, target }])
    expect(onEnter).toHaveBeenCalledTimes(0)
    expect(onExit).toHaveBeenCalledTimes(0)
    callback([{ isIntersecting: false, intersectionRatio: -1, target }])
    expect(onEnter).toHaveBeenCalledTimes(0)
    expect(onExit).toHaveBeenCalledTimes(0)
  })

  it('unobserves in callback', () => {
    const onEnter = vi.fn()
    const onExit = vi.fn()
    const observer = new VisibilityObserver()
    const target = document.getElementById('target')
    observer.observe(target, {
      onEnter: ({ unobserve }) => {
        unobserve()
        onEnter()
      },
      onExit: ({ unobserve }) => {
        unobserve()
        onExit()
      }
    })
    callback([{ isIntersecting: false, intersectionRatio: -1, target }])
    expect(onEnter).toHaveBeenCalledTimes(0)
    expect(onExit).toHaveBeenCalledTimes(0)
    expect(unobserveMock).toHaveBeenCalledTimes(0)
    callback([{ isIntersecting: true, intersectionRatio: 1, target }])
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(0)
    expect(unobserveMock).toHaveBeenCalledTimes(0)
    callback([{ isIntersecting: false, intersectionRatio: -1, target }])
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(unobserveMock).toHaveBeenCalledTimes(1)
    callback([{ isIntersecting: true, intersectionRatio: 1, target }])
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)
    callback([{ isIntersecting: false, intersectionRatio: -1, target }])
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
