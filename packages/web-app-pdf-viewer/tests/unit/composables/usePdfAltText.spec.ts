import { mock } from 'vitest-mock-extended'
import type { AnnotationEditorUIManager } from 'pdfjs-dist'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useModals, type Modal } from '@opencloud-eu/web-pkg'
import { usePdfAltText } from '../../../src/composables/usePdfAltText'
import { getMissingMembers } from '../pdfjsSource'

type AltTextData = { altText?: string; decorative?: boolean }
type AltTextModalAttrs = AltTextData & { onSave: (data: AltTextData) => void }

function setup(altTextData?: AltTextData) {
  const onChange = vi.fn()
  let altText: ReturnType<typeof usePdfAltText>
  let modals: ReturnType<typeof useModals>
  getComposableWrapper(() => {
    modals = useModals()
    altText = usePdfAltText({ onChange })
  })
  const uiManager = mock<AnnotationEditorUIManager>()
  const editor = { altTextData, altTextFinish: vi.fn() }
  altText.altTextManager.editAltText(uiManager, editor)
  const modal = vi.mocked(modals.dispatchModal).mock.calls[0][0] as Modal
  const attrs = modal.customComponentAttrs() as AltTextModalAttrs
  return { modal, attrs, uiManager, editor, onChange }
}

describe('usePdfAltText', () => {
  // PDF.js does without what is missing, e.g. after an update.
  it('provides everything PDF.js uses of the alt text manager', () => {
    let altText: ReturnType<typeof usePdfAltText>
    getComposableWrapper(() => {
      altText = usePdfAltText({ onChange: vi.fn() })
    })
    expect(getMissingMembers('altTextManager', altText.altTextManager)).toEqual([])
  })

  it('opens a dialog with the current description and pauses PDF.js shortcuts', () => {
    const { attrs, uiManager } = setup({ altText: 'A cat', decorative: false })
    expect(attrs).toEqual(expect.objectContaining({ altText: 'A cat', decorative: false }))
    expect(uiManager.removeEditListeners).toHaveBeenCalled()
  })

  it('saves the description into the image annotation', () => {
    const { attrs, editor, uiManager, onChange } = setup()
    attrs.onSave({ altText: 'A dog', decorative: false })
    expect(editor.altTextData).toEqual({ altText: 'A dog', decorative: false })
    expect(editor.altTextFinish).toHaveBeenCalled()
    expect(uiManager.addEditListeners).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalled()
  })

  it('restores PDF.js when cancelled, without changes', () => {
    const { modal, editor, uiManager, onChange } = setup({ altText: 'A cat' })
    modal.onCancel()
    expect(editor.altTextData).toEqual({ altText: 'A cat' })
    expect(editor.altTextFinish).toHaveBeenCalledTimes(1)
    expect(uiManager.addEditListeners).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
  })
})
