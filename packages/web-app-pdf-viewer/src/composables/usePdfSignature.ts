import { markRaw, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { AnnotationEditorUIManager } from 'pdfjs-dist'
import { useModals } from '@opencloud-eu/web-pkg'
import { pauseEditShortcuts } from '../helpers/editShortcuts'
import { getEditorUiManager, getImageBitmap } from '../helpers/pdfjsInternals'
import type {
  NewSignatureData,
  SavedSignature,
  usePdfSignatureStorage
} from './usePdfSignatureStorage'
import PdfSignatureModal from '../components/PdfSignatureModal.vue'
import { useCanPickImageFromCloud } from './usePdfCloudImagePicker'

/** Outline data as returned by PDF.js' SignatureEditor helpers, passed back as is. */
export type SignatureData = NewSignatureData & {
  outline: { viewBox: string; toSVGPath(): string }
}

/** Drawn strokes, collected the way PDF.js' signature dialog does. */
export type DrawnCurves = {
  width: number
  height: number
  thickness: number
  curves: { points: number[] }[]
}

// Same as the PDF.js viewer.
const DEFAULT_HEIGHT_IN_PAGE = 40

type SignatureEditor = {
  description: string | null
  getDrawnSignature(curves: DrawnCurves): SignatureData | null
  getFromText(text: string, style: CSSStyleDeclaration): SignatureData | null
  getFromImage(bitmap: ImageBitmap): SignatureData | null
  addSignature(
    data: SignatureData,
    heightInPage: number,
    description: string,
    uuid: string | null
  ): void
  remove(): void
}

/**
 * The parameters to create a signature editor with a saved signature, placed right away like
 * the saved signatures in the PDF.js viewer's toolbar.
 */
export function getSavedSignatureParams({ lines, areContours, description, uuid }: SavedSignature) {
  return {
    signatureData: {
      lines,
      mustSmooth: false,
      areContours,
      description,
      uuid,
      heightInPage: DEFAULT_HEIGHT_IN_PAGE
    }
  }
}

/**
 * PDF.js ships the signature editor, but the dialog to create a signature is part of the
 * full PDF.js viewer only. This provides the same contract as its SignatureManager with
 * OpenCloud modals, signatures can be saved for reuse like there.
 */
export function usePdfSignature({
  storage,
  onChange,
  onCancel,
  pickImageFromCloud
}: {
  storage: Pick<ReturnType<typeof usePdfSignatureStorage>, 'isFull' | 'save'>
  onChange: () => void
  /** No signature was added. */
  onCancel: () => void
  /** Picks an image of the signature from the cloud, like images of annotations. */
  pickImageFromCloud?: (onImage: (file: File) => void) => void
}) {
  const { $gettext } = useGettext()
  const { dispatchModal, updateModal } = useModals()
  const canPickFromCloud = useCanPickImageFromCloud()

  function getSignature({
    uiManager,
    editor
  }: {
    uiManager: AnnotationEditorUIManager
    editor: SignatureEditor
  }) {
    const resume = pauseEditShortcuts(uiManager)
    dispatchModal({
      elementClass: 'pdf-viewer-signature-modal',
      title: $gettext('Add signature'),
      confirmText: $gettext('Add'),
      confirmDisabled: true,
      // The first tab, like in the PDF.js viewer.
      focusTrapInitial: '.pdf-viewer-signature-tab-type',
      customComponent: markRaw(PdfSignatureModal),
      customComponentAttrs: () => ({
        getDrawnSignature: (curves: DrawnCurves) => editor.getDrawnSignature(curves),
        getFromText: (text: string, style: CSSStyleDeclaration) => editor.getFromText(text, style),
        getFromImage: async (file: File) => {
          const bitmap = await getImageBitmap(uiManager, file)
          return bitmap ? editor.getFromImage(bitmap) : null
        },
        canSave: !unref(storage.isFull),
        pickImageFromCloud: unref(canPickFromCloud) ? pickImageFromCloud : undefined,
        onSave: (data: SignatureData, description: string, isSaved: boolean) => {
          // Without saving if there's no room.
          const uuid = isSaved ? storage.save(data, description) : null
          editor.addSignature(data, DEFAULT_HEIGHT_IN_PAGE, description, uuid)
          resume()
          onChange()
        }
      }),
      onCancel: () => {
        // The editor was only created to hold the new signature.
        editor.remove()
        resume()
        onCancel()
      }
    })
  }

  function editDescription(editor: SignatureEditor) {
    const uiManager = getEditorUiManager(editor)
    if (!uiManager) {
      return
    }
    const resume = pauseEditShortcuts(uiManager)
    const previous = editor.description ?? ''
    // Like the PDF.js viewer's dialog: Update is only on for a change.
    const modal = dispatchModal({
      title: $gettext('Edit description'),
      confirmText: $gettext('Update'),
      confirmDisabled: true,
      hasInput: true,
      inputValue: previous,
      inputLabel: $gettext('Description (alt text)'),
      onInput: (value: string) => updateModal(modal.id, 'confirmDisabled', value === previous),
      onConfirm: (value: string) => {
        editor.description = value.trim()
        resume()
        onChange()
      },
      onCancel: resume
    })
  }

  const signatureManager = {
    getSignature,
    // The saved signatures are listed in the drop of the signature tool, kept up to date there.
    loadSignatures: () => Promise.resolve(),
    // Button in PDF.js' toolbar of a selected signature, styled by PDF.js.
    renderEditButton(editor: SignatureEditor) {
      const button = document.createElement('button')
      button.className = 'altText editDescription'
      button.title = editor.description || ''
      const label = document.createElement('span')
      label.textContent = $gettext('Edit description')
      button.append(label)
      button.addEventListener('click', () => editDescription(editor))
      return Promise.resolve(button)
    },
    destroy() {}
  }

  return { signatureManager }
}
