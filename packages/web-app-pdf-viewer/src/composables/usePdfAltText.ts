import { markRaw } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { AnnotationEditorUIManager } from 'pdfjs-dist'
import { useModals } from '@opencloud-eu/web-pkg'
import { pauseEditShortcuts } from '../helpers/editShortcuts'
import PdfAltTextModal, { type AltTextData } from '../components/PdfAltTextModal.vue'

type AltTextEditor = {
  altTextData: Partial<AltTextData> | undefined
  altTextFinish(): void
}

/**
 * PDF.js shows an "Alt text" button on images, but the dialog behind it is part of the full
 * PDF.js viewer only. This provides the same contract as its AltTextManager with an
 * OpenCloud modal, so PDF.js' own button works.
 */
export function usePdfAltText({ onChange }: { onChange: () => void }) {
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()

  const altTextManager = {
    editAltText(uiManager: AnnotationEditorUIManager, editor: AltTextEditor) {
      const { altText = '', decorative = false } = editor.altTextData ?? {}
      const resume = pauseEditShortcuts(uiManager)
      function finish() {
        resume()
        editor.altTextFinish()
      }

      dispatchModal({
        elementClass: 'pdf-viewer-alt-text-modal',
        focusTrapInitial: '.pdf-viewer-alt-text-input textarea',
        title: $gettext('Image description'),
        confirmText: $gettext('Save'),
        customComponent: markRaw(PdfAltTextModal),
        customComponentAttrs: () => ({
          altText,
          decorative,
          onSave: (data: AltTextData) => {
            editor.altTextData = data
            finish()
            onChange()
          }
        }),
        onCancel: finish
      })
    },
    destroy() {}
  }

  return { altTextManager }
}
