import { config } from '@vue/test-utils'

class IntersectionObserverMock {
  disconnect() {}
  observe() {}
  takeRecords() {}
  unobserve() {}
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

vi.stubGlobal('define', vi.fn())

// production builds always inject it, routing helpers like buildUrl rely on it for history mode
const base = document.createElement('base')
base.href = '/'
document.head.appendChild(base)

// never stub the highlighting primitive, otherwise text assertions lose the highlighted text
config.global.stubs = { ...config.global.stubs, FilterHighlight: false }

// happy-dom returns an empty nodeName via Node.prototype, which DOMPurify relies on
const nodeNameGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName').get
Object.defineProperty(Node.prototype, 'nodeName', {
  configurable: true,
  get() {
    let proto = Object.getPrototypeOf(this)
    while (proto && proto !== Node.prototype) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'nodeName')
      if (descriptor?.get) {
        return descriptor.get.call(this)
      }
      proto = Object.getPrototypeOf(proto)
    }
    return nodeNameGetter.call(this)
  }
})
