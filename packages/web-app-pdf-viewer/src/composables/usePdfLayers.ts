import { shallowRef, unref, type InjectionKey, type ShallowRef } from 'vue'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'

// Not exported by pdfjs-dist under its name.
type OptionalContentConfig = Awaited<ReturnType<PDFDocumentProxy['getOptionalContentConfig']>>

export type PdfLayer = { id: string; name: string; isVisible: boolean }
/** A group of layers, without a name in the PDF it's "Additional layers" in the PDF.js viewer. */
export type PdfLayerGroup = { name: string | null; items: PdfLayerItem[] }
export type PdfLayerItem = PdfLayer | PdfLayerGroup

type Order = (string | { name: string | null; order: Order })[]

export function isLayerGroup(item: PdfLayerItem): item is PdfLayerGroup {
  return 'items' in item
}

function getItems(config: OptionalContentConfig, order: Order): PdfLayerItem[] {
  return order.map((entry) => {
    if (typeof entry === 'object') {
      return { name: entry.name, items: getItems(config, entry.order) }
    }
    const { name, visible } = config.getGroup(entry)
    return { id: entry, name: name ?? '', isVisible: visible }
  })
}

/**
 * The layers (optional content) of the document, like in the PDF.js viewer: undefined while
 * loading, empty if there are none. Toggling one renders the pages again, and changes by the
 * document itself (e.g. a link that shows a layer) show here.
 */
export function usePdfLayers({
  viewer,
  eventBus
}: {
  viewer: ShallowRef<PDFViewer | undefined>
  eventBus: EventBus
}) {
  const layers = shallowRef<PdfLayerItem[]>()
  let config: OptionalContentConfig | null = null

  async function update(promise: Promise<OptionalContentConfig | null>) {
    // Broken layers in the file are left out instead of loading forever.
    const current = await promise.catch((): null => null)
    // A newer document or change came in meanwhile.
    if (promise !== unref(viewer)?.optionalContentConfigPromise) {
      return
    }
    config = current
    const order = current?.getOrder() as Order | null
    layers.value = order ? getItems(current, order) : []
  }

  // After a document is set, PDFViewer has its layers.
  eventBus.on('pagesinit', () => {
    layers.value = undefined
    update(unref(viewer).optionalContentConfigPromise)
  })
  eventBus.on(
    'optionalcontentconfigchanged',
    ({ promise }: { promise: Promise<OptionalContentConfig> }) => update(promise)
  )

  function setVisible(id: string, isVisible: boolean) {
    if (!config) {
      return
    }
    config.setVisibility(id, isVisible)
    unref(viewer).optionalContentConfigPromise = Promise.resolve(config)
  }

  return { layers, setVisible }
}

export const pdfLayersKey: InjectionKey<ReturnType<typeof usePdfLayers>> = Symbol('pdfLayers')
