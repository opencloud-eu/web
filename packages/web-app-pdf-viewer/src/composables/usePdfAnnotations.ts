import { toValue, unref, type MaybeRefOrGetter } from 'vue'
import { AnnotationEditorType } from 'pdfjs-dist'
import type { Resource } from '@opencloud-eu/web-client'
import { usePdfAltText } from './usePdfAltText'
import { getSavedSignatureParams, usePdfSignature } from './usePdfSignature'
import { usePdfSignatureStorage, type SavedSignature } from './usePdfSignatureStorage'
import { usePdfComments } from './usePdfComments'
import { usePdfCloudImagePicker } from './usePdfCloudImagePicker'
import type { usePdfViewer } from './usePdfViewer'
import { RASTER_IMAGE_TYPES } from '../helpers/rasterImages'

type ViewerParts = Pick<
  ReturnType<typeof usePdfViewer>,
  'editing' | 'linkService' | 'getAnnotationComment'
>

/**
 * What annotating needs beyond PDF.js: the managers for image descriptions, signatures and
 * comments, the saved signatures, the list of comments and images from the cloud.
 */
export function usePdfAnnotations({
  resource,
  isReadOnly,
  commentsDrop,
  getViewer,
  onChange
}: {
  resource: MaybeRefOrGetter<Resource>
  isReadOnly: MaybeRefOrGetter<boolean>
  /** The list of comments, see PdfCommentsDrop. */
  commentsDrop: MaybeRefOrGetter<{ isShown: boolean; show(): void } | null>
  /** The viewer needs the managers when it is created, so it comes afterwards. */
  getViewer: () => ViewerParts
  /** Changing image or signature descriptions is a change of the document as well. */
  onChange: () => void
}) {
  function getEditing() {
    return getViewer().editing
  }

  const { altTextManager } = usePdfAltText({ onChange })

  const {
    signatures: savedSignatures,
    remove: removeSavedSignature,
    ...signatureStorage
  } = usePdfSignatureStorage()
  const { signatureManager } = usePdfSignature({
    storage: signatureStorage,
    onChange,
    // Without a signature the tool is no use.
    onCancel: () => getEditing().leaveTool(),
    pickImageFromCloud: (onImage) => openPicker(onImage, RASTER_IMAGE_TYPES)
  })

  const pdfComments = usePdfComments({
    isReadOnly,
    onChange,
    getUiManager: () => unref(getEditing().uiManager),
    getAnnotationComment: (pageIndex, id) => getViewer().getAnnotationComment(pageIndex, id),
    goToXY: (pageNumber, x, y) =>
      getViewer().linkService.goToXY(pageNumber, x, y, { center: 'both' })
  })

  const { openPicker } = usePdfCloudImagePicker({
    resource,
    onImage: (file) => getEditing().createEditor(AnnotationEditorType.STAMP, { bitmapFile: file })
  })

  function addImage(source: 'device' | 'cloud') {
    if (source === 'cloud') {
      openPicker()
      return
    }
    // PDF.js asks for an image file.
    getEditing().createEditor(AnnotationEditorType.STAMP)
  }

  function addSavedSignature(signature: SavedSignature) {
    getEditing().createEditor(AnnotationEditorType.SIGNATURE, getSavedSignatureParams(signature))
  }

  function chooseTool(mode: number) {
    // PDF.js provides the comments while its comments tool is active. The button brings their list
    // back after it made room for a comment.
    const drop = toValue(commentsDrop)
    const isCommentsToolActive = !!unref(pdfComments.comments)
    if (drop && mode === AnnotationEditorType.POPUP && isCommentsToolActive && !drop.isShown) {
      drop.show()
      return
    }
    getEditing().selectTool(mode)
  }

  return {
    altTextManager,
    signatureManager,
    savedSignatures,
    removeSavedSignature,
    ...pdfComments,
    addImage,
    addSavedSignature,
    chooseTool
  }
}
