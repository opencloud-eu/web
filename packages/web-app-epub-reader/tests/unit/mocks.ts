import { Location, NavItem } from 'epubjs'
import { defineComponent, h } from 'vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

type Listener = (...args: unknown[]) => void

export function createRenditionMock() {
  const listeners: Record<string, Listener[]> = {}
  return {
    on: vi.fn((event: string, listener: Listener) => {
      listeners[event] = [...(listeners[event] || []), listener]
    }),
    emit(event: string, ...args: unknown[]) {
      for (const listener of listeners[event] || []) {
        listener(...args)
      }
    },
    display: vi.fn(() => Promise.resolve()),
    currentLocation: vi.fn((): Location | undefined => undefined),
    prev: vi.fn(),
    next: vi.fn(),
    destroy: vi.fn(),
    resize: vi.fn(),
    reportLocation: vi.fn(),
    getContents: vi.fn(() => [] as Array<{ document?: Document }>),
    getRange: vi.fn<(cfi: string) => { startContainer: Node } | null>(() => null),
    themes: {
      register: vi.fn(),
      select: vi.fn(),
      fontSize: vi.fn()
    },
    annotations: {
      highlight: vi.fn(),
      remove: vi.fn()
    }
  }
}
export type RenditionMock = ReturnType<typeof createRenditionMock>

export type SpineItemMock = {
  href: string
  idref: string
  index: number
  linear: boolean
  type: string
  load: ReturnType<typeof vi.fn>
  find: ReturnType<typeof vi.fn>
  unload: ReturnType<typeof vi.fn>
}

export function createSpineItemMock(
  href: string,
  index: number,
  matches: Array<{ cfi?: string }> = [],
  { type = 'application/xhtml+xml', linear = true }: { type?: string; linear?: boolean } = {}
): SpineItemMock {
  return {
    href,
    idref: href,
    index,
    linear,
    type,
    load: vi.fn(() => Promise.resolve()),
    find: vi.fn(() => matches),
    unload: vi.fn()
  }
}

export function createBookMock({
  toc = [],
  spineItems = [],
  rendition = createRenditionMock(),
  navPath = 'nav.xhtml'
}: {
  toc?: NavItem[]
  spineItems?: SpineItemMock[]
  rendition?: RenditionMock
  navPath?: string
} = {}) {
  return {
    ready: Promise.resolve(),
    packaging: {
      navPath,
      ncxPath: '',
      manifest: Object.fromEntries(
        spineItems.map((item) => [item.idref, { href: item.href, type: item.type }])
      )
    },
    loaded: { navigation: Promise.resolve({ toc }) },
    load: vi.fn(),
    destroy: vi.fn(),
    renderTo: vi.fn(() => rendition),
    rendition,
    spine: {
      spineItems,
      get: vi.fn((href: string) => spineItems.find((item) => item.href === href))
    },
    locations: {
      generate: vi.fn(() => Promise.resolve([])),
      cfiFromPercentage: vi.fn((value: number) => `cfi-${value}`),
      length: vi.fn(() => 1000)
    }
  }
}
export type BookMock = ReturnType<typeof createBookMock>

export function createLocation(
  start: Partial<Location['start']> = {},
  atEdges = {},
  end: Partial<Location['end']> = {}
): Location {
  const resolvedStart = { index: 0, href: 'c1', cfi: 'epubcfi(/6/2!/4/2/1:0)', ...start }
  return {
    start: resolvedStart,
    end: { ...resolvedStart, ...end },
    atStart: false,
    atEnd: false,
    ...atEdges
  } as Location
}

/** Runs a composable inside a component, so lifecycle hooks and injections work. */
export function mountComposable<T>(setup: () => T) {
  let result: T
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return () => h('div')
      }
    }),
    { global: { plugins: [...defaultPlugins()] } }
  )
  return { result, wrapper }
}
