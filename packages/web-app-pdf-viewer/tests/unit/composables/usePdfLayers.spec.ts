import { shallowRef } from 'vue'
import { mock } from 'vitest-mock-extended'
import type { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfLayers } from '../../../src/composables/usePdfLayers'

function createConfig() {
  const groups = new Map([
    ['5R', { name: 'Background', visible: true }],
    ['6R', { name: 'Notes', visible: true }],
    ['7R', { name: 'Comments', visible: false }]
  ])
  return {
    getOrder: () => ['5R', { name: null as string | null, order: ['6R', '7R'] }],
    getGroup: (id: string) => groups.get(id),
    setVisibility: vi.fn((id: string, visible: boolean) => {
      groups.get(id).visible = visible
    })
  }
}

function setup(config: object | null | Error = createConfig()) {
  const listeners: Record<string, (event?: object) => void> = {}
  const eventBus = mock<EventBus>({
    on: (name: string, listener: () => void) => (listeners[name] = listener)
  })
  const viewer = mock<PDFViewer>()
  let layers: ReturnType<typeof usePdfLayers>
  getComposableWrapper(() => {
    layers = usePdfLayers({ viewer: shallowRef(viewer), eventBus })
  })
  // Like PDFViewer: a new promise reports the change.
  Object.defineProperty(viewer, 'optionalContentConfigPromise', {
    get: () => current,
    set: (promise) => {
      current = promise
      listeners.optionalcontentconfigchanged({ promise })
    }
  })
  let current = config instanceof Error ? Promise.reject(config) : Promise.resolve(config)
  return { layers, listeners, config }
}

describe('usePdfLayers', () => {
  it('lists the layers of the document in their order, groups nested', async () => {
    const { layers, listeners } = setup()
    expect(layers.layers.value).toBeUndefined()
    listeners.pagesinit()
    await vi.waitFor(() => expect(layers.layers.value).toBeDefined())
    expect(layers.layers.value).toEqual([
      { id: '5R', name: 'Background', isVisible: true },
      {
        name: null,
        items: [
          { id: '6R', name: 'Notes', isVisible: true },
          { id: '7R', name: 'Comments', isVisible: false }
        ]
      }
    ])
  })

  it.each([
    ['without', null],
    ['with broken ones', new Error('Broken')]
  ])('has no layers for documents %s', async (_, config) => {
    const { layers, listeners } = setup(config)
    listeners.pagesinit()
    await vi.waitFor(() => expect(layers.layers.value).toEqual([]))
  })

  it('shows and hides layers, the pages are rendered again', async () => {
    const { layers, listeners, config } = setup()
    listeners.pagesinit()
    await vi.waitFor(() => expect(layers.layers.value).toBeDefined())
    layers.setVisible('7R', true)
    expect((config as ReturnType<typeof createConfig>).setVisibility).toHaveBeenCalledWith(
      '7R',
      true
    )
    await vi.waitFor(() =>
      expect(layers.layers.value[1]).toMatchObject({ items: [{}, { id: '7R', isVisible: true }] })
    )
  })
})
