import { useEffect, useRef, useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { ExcalidrawBinding } from 'y-excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'

// Excalidraw lazy-loads fonts / locales / lib data at runtime. Without an
// override, it falls back to `https://esm.sh/@excalidraw/excalidraw@…/dist/prod/`
// — which would mean whitelisting esm.sh in OC's CSP. We mirror the
// upstream prod/{fonts,locales,data} tree into our own dist via
// viteStaticCopy (see root vite.config.ts) and point Excalidraw at it.
//
// `new URL(..., import.meta.url)` is the only path that survives an OC
// subpath deployment: import.meta.url at runtime is the actual served
// URL of this chunk (`<oc-root>/js/web-app-excalidraw-XXXX.mjs`), so the
// resolved asset URL becomes `<oc-root>/excalidraw-assets/` regardless of
// where OC is mounted.
const EXCALIDRAW_ASSET_PATH = new URL('../excalidraw-assets/', import.meta.url).href
if (typeof window !== 'undefined') {
  const w = window as unknown as { EXCALIDRAW_ASSET_PATH?: string | string[] }
  if (!w.EXCALIDRAW_ASSET_PATH) {
    w.EXCALIDRAW_ASSET_PATH = EXCALIDRAW_ASSET_PATH
  }
}

interface ExcalidrawCanvasProps {
  ydoc: Y.Doc
  awareness: Awareness
  isReadOnly?: boolean
}

// Test hook: exposes the live ExcalidrawImperativeAPI on `window` so the
// cucumber suite can read `getSceneElements()` etc. without trying to query
// the canvas DOM (Excalidraw paints to a single `<canvas>` element, no
// per-element DOM is available for selectors). Cleared on unmount.
declare global {
  interface Window {
    __excalidrawAPI?: ExcalidrawImperativeAPI
  }
}

export default function ExcalidrawCanvas({
  ydoc,
  awareness,
  isReadOnly = false
}: ExcalidrawCanvasProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!api) return

    const yElements = ydoc.getArray<Y.Map<unknown>>('elements')
    const yAssets = ydoc.getMap('assets')

    // y-excalidraw needs the DOM node for its undo/redo button hijacking.
    // We pass it only when we also pass an undoManager; without one, the
    // binding skips that whole block and the DOM node isn't read.
    const undoManager = new Y.UndoManager(yElements, {
      // Skip transactions coming from the wrapper (hydrate / reset /
      // stale-recovery) — those aren't user actions and shouldn't land in
      // the undo stack.
      trackedOrigins: new Set([null, undefined])
    })

    const binding = new ExcalidrawBinding(
      yElements,
      yAssets,
      api,
      awareness,
      containerRef.current ? { excalidrawDom: containerRef.current, undoManager } : undefined
    )

    window.__excalidrawAPI = api

    return () => {
      binding.destroy()
      undoManager.destroy()
      if (window.__excalidrawAPI === api) delete window.__excalidrawAPI
    }
  }, [api, ydoc, awareness])

  // We do NOT pass `initialData` to Excalidraw — the wrapper hydrates the
  // Y.Doc first, and the binding's constructor calls
  // `api.updateScene({ elements: yjsToExcalidraw(yElements) })` synchronously
  // after we register it. Skipping initialData avoids a flash of
  // un-collab-synced state and double-rendering.

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} className="excalidraw-host">
      <Excalidraw
        excalidrawAPI={(instance: ExcalidrawImperativeAPI) => setApi(instance)}
        viewModeEnabled={isReadOnly}
        onPointerUpdate={(payload: {
          pointer: { x: number; y: number; tool: 'pointer' | 'laser' }
          button: 'down' | 'up'
        }) => {
          // The ExcalidrawBinding exposes `onPointerUpdate`, but it can only
          // be wired once the `api` ref is set — and the prop is captured
          // at render time. Easiest: forward straight to awareness here and
          // let the binding's awareness observer pick remote ones up.
          awareness.setLocalStateField('pointer', payload.pointer)
          awareness.setLocalStateField('button', payload.button)
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: !isReadOnly
          }
        }}
      />
    </div>
  )
}
