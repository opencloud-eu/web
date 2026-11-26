import { mock } from 'vitest-mock-extended'
import type { AnnotationEditorUIManager } from 'pdfjs-dist'
import { pauseEditShortcuts } from '../../../src/helpers/editShortcuts'

describe('pauseEditShortcuts', () => {
  it('pauses the shortcuts until resumed, once', () => {
    const uiManager = mock<AnnotationEditorUIManager>()
    const resume = pauseEditShortcuts(uiManager)
    expect(uiManager.removeEditListeners).toHaveBeenCalled()
    resume()
    resume()
    expect(uiManager.addEditListeners).toHaveBeenCalledTimes(1)
  })
})
