import { defineAsyncComponent } from 'vue'
import type TextEditorViewerComponent from '../editor/components/TextEditorViewer.vue'

function loadEditor() {
  return import('../editor')
}

/**
 * Starts fetching the editor chunk. Call it in parallel to loading the content
 * so both are ready at the same time. Repeated calls reuse the same request.
 */
export async function preloadTextEditor(): Promise<void> {
  try {
    await loadEditor()
  } catch {
    // the component reports the failure
  }
}

/**
 * Read-only editor view. Loaded async, so importing it does not pull the editor
 * (tiptap, prosemirror, highlight.js) into the importing chunk.
 */
export const TextEditorViewer = defineAsyncComponent(
  async () => (await loadEditor()).TextEditorViewer
) as unknown as typeof TextEditorViewerComponent
