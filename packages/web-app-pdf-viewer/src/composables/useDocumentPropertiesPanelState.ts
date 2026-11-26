import { ref, shallowRef } from 'vue'
import { createGlobalState } from '@vueuse/core'
import type { DocumentProperties } from '../helpers/documentProperties'

// Separate from usePdfDocumentProperties: the app's index.ts needs these, and it must not import
// pdfjs-dist, which would load PDF.js on every start instead of when a PDF is opened.

export const documentPropertiesPanelName = 'pdf-viewer-document-properties'

/**
 * What the panel in the right sidebar shows. The sidebar belongs to the AppWrapper, so the open
 * document shares its properties through this.
 */
export const useDocumentPropertiesPanelState = createGlobalState(() => ({
  resourceId: ref<string>(),
  properties: shallowRef<DocumentProperties>()
}))
