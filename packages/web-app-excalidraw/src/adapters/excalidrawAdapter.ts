import * as Y from 'yjs'
import { yjsToExcalidraw } from 'y-excalidraw'
import { generateKeyBetween } from 'fractional-indexing'
import type { CollaborativeAdapter } from '@opencloud-eu/web-pkg'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'

// Y.Array/Y.Map shapes that match what `y-excalidraw`'s ExcalidrawBinding
// reads and writes. Each Y.Map in the elements array carries:
//   { el: ExcalidrawElement, pos: string (fractional-indexing key) }
// Assets is a flat Y.Map keyed by file id with BinaryFileData values.
const ELEMENTS_KEY = 'elements'
const ASSETS_KEY = 'assets'

interface ExcalidrawWireFormat {
  type?: string
  version?: number
  source?: string
  elements?: ExcalidrawElement[]
  appState?: Record<string, unknown>
  files?: BinaryFiles
}

const APP_NAME = 'opencloud-excalidraw'
const APP_STATE_DEFAULTS: Record<string, unknown> = {
  viewBackgroundColor: '#ffffff',
  gridSize: null
}

/**
 * Seed the Y.Array with elements from a parsed .excalidraw payload.
 * We assign each element a fractional-indexing position so later inserts
 * between two existing elements can land at a stable spot without
 * renumbering. y-excalidraw's helpers expect this exact shape.
 */
function seedElements(yElements: Y.Array<Y.Map<unknown>>, elements: ExcalidrawElement[]) {
  let prevKey: string | null = null
  for (const el of elements) {
    const pos = generateKeyBetween(prevKey, null)
    const yEl = new Y.Map<unknown>()
    yEl.set('el', el)
    yEl.set('pos', pos)
    yElements.push([yEl])
    prevKey = pos
  }
}

export const excalidrawAdapter: CollaborativeAdapter = {
  hydrate(ydoc, content) {
    if (!content) return
    let parsed: ExcalidrawWireFormat
    try {
      parsed = JSON.parse(content) as ExcalidrawWireFormat
    } catch {
      // Empty / unparseable file: nothing to seed, the editor will open
      // on a blank canvas.
      return
    }
    const yElements = ydoc.getArray<Y.Map<unknown>>(ELEMENTS_KEY)
    const yAssets = ydoc.getMap(ASSETS_KEY)
    // The wrapper's election only lets one client hydrate, so this re-entry
    // guard is more belt-and-braces than load-bearing.
    if (yElements.length > 0 || yAssets.size > 0) return
    ydoc.transact(() => {
      if (parsed.elements?.length) {
        seedElements(yElements, parsed.elements)
      }
      if (parsed.files) {
        for (const [id, file] of Object.entries(parsed.files)) {
          yAssets.set(id, file)
        }
      }
    }, 'hydrate')
  },

  serialize(ydoc) {
    const yElements = ydoc.getArray<Y.Map<unknown>>(ELEMENTS_KEY)
    const yAssets = ydoc.getMap(ASSETS_KEY)
    const elements = yjsToExcalidraw(yElements)
    const files: BinaryFiles = {}
    for (const key of yAssets.keys()) {
      files[key] = yAssets.get(key) as BinaryFiles[string]
    }
    const payload: ExcalidrawWireFormat = {
      type: 'excalidraw',
      version: 2,
      source: APP_NAME,
      elements,
      appState: APP_STATE_DEFAULTS,
      files
    }
    return JSON.stringify(payload)
  },

  hasContent(ydoc) {
    return ydoc.getArray(ELEMENTS_KEY).length > 0
  },

  reset(ydoc) {
    const yElements = ydoc.getArray<Y.Map<unknown>>(ELEMENTS_KEY)
    const yAssets = ydoc.getMap(ASSETS_KEY)
    if (yElements.length === 0 && yAssets.size === 0) return
    ydoc.transact(() => {
      yElements.delete(0, yElements.length)
      for (const key of Array.from(yAssets.keys())) yAssets.delete(key)
    }, 'reset')
  }
}
