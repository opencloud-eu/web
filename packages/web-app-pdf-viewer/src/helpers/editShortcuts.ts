import type { AnnotationEditorUIManager } from 'pdfjs-dist'

/**
 * Keeps PDF.js' editing shortcuts (e.g. Backspace deletes the selected annotation) out of a
 * dialog. Returns the function to resume them, which only acts once.
 */
export function pauseEditShortcuts(uiManager: AnnotationEditorUIManager) {
  uiManager.removeEditListeners()
  let isResumed = false
  return () => {
    if (isResumed) {
      return
    }
    isResumed = true
    uiManager.addEditListeners()
  }
}
