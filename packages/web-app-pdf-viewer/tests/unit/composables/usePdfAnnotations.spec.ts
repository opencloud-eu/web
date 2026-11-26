import { shallowRef } from 'vue'
import { mock } from 'vitest-mock-extended'
import { AnnotationEditorType } from 'pdfjs-dist'
import type { Resource } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfAnnotations } from '../../../src/composables/usePdfAnnotations'
import type { usePdfViewer } from '../../../src/composables/usePdfViewer'
import type { usePdfEditing } from '../../../src/composables/usePdfEditing'
import { usePdfSignature } from '../../../src/composables/usePdfSignature'
import { usePdfComments } from '../../../src/composables/usePdfComments'
import { usePdfCloudImagePicker } from '../../../src/composables/usePdfCloudImagePicker'
import type { CommentData } from '../../../src/helpers/comments'
import { RASTER_IMAGE_TYPES } from '../../../src/helpers/rasterImages'

vi.mock('../../../src/composables/usePdfSignature', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/composables/usePdfSignature')>()),
  usePdfSignature: vi.fn(() => ({ signatureManager: {} }))
}))
vi.mock('../../../src/composables/usePdfComments', () => ({ usePdfComments: vi.fn() }))
vi.mock('../../../src/composables/usePdfCloudImagePicker', () => ({
  usePdfCloudImagePicker: vi.fn()
}))

function setup({ hasComments = false, isListShown = false } = {}) {
  const editing = mock<ReturnType<typeof usePdfEditing>>()
  const viewer = mock<ReturnType<typeof usePdfViewer>>({ editing })
  const commentsDrop = { isShown: isListShown, show: vi.fn() }
  const openPicker = vi.fn()
  vi.mocked(usePdfCloudImagePicker).mockReturnValue({ openPicker })
  vi.mocked(usePdfComments).mockReturnValue(
    mock<ReturnType<typeof usePdfComments>>({
      comments: shallowRef(hasComments ? [mock<CommentData>()] : undefined)
    })
  )
  let annotations: ReturnType<typeof usePdfAnnotations>
  getComposableWrapper(() => {
    annotations = usePdfAnnotations({
      resource: mock<Resource>(),
      isReadOnly: false,
      commentsDrop: () => commentsDrop,
      getViewer: () => viewer,
      onChange: vi.fn()
    })
  })
  return { annotations, editing, commentsDrop, openPicker }
}

describe('usePdfAnnotations', () => {
  it('brings the list of comments back instead of choosing the comments tool again', () => {
    const { annotations, editing, commentsDrop } = setup({ hasComments: true })
    annotations.chooseTool(AnnotationEditorType.POPUP)
    expect(commentsDrop.show).toHaveBeenCalled()
    expect(editing.selectTool).not.toHaveBeenCalled()
  })

  it.each([
    ['the comments tool while its list is shown', AnnotationEditorType.POPUP, true, true],
    ['the comments tool while it is not active', AnnotationEditorType.POPUP, false, false],
    ['other tools', AnnotationEditorType.INK, true, false]
  ])('chooses %s', (_name, mode, hasComments, isListShown) => {
    const { annotations, editing, commentsDrop } = setup({ hasComments, isListShown })
    annotations.chooseTool(mode)
    expect(editing.selectTool).toHaveBeenCalledWith(mode)
    expect(commentsDrop.show).not.toHaveBeenCalled()
  })

  it('leaves the signature tool when no signature was added', () => {
    const { editing } = setup()
    vi.mocked(usePdfSignature).mock.lastCall[0].onCancel()
    expect(editing.leaveTool).toHaveBeenCalled()
  })

  // The file picker disables the others.
  it('picks signature images from the cloud with the file picker, raster images only', () => {
    const { openPicker } = setup()
    const onImage = vi.fn()
    vi.mocked(usePdfSignature).mock.lastCall[0].pickImageFromCloud(onImage)
    expect(openPicker).toHaveBeenCalledWith(onImage, RASTER_IMAGE_TYPES)
    expect(RASTER_IMAGE_TYPES).toContain('image/avif')
    expect(RASTER_IMAGE_TYPES).not.toContain('image/svg+xml')
  })

  it('picks images from the cloud with the file picker, all types PDF.js supports', () => {
    const { annotations, openPicker } = setup()
    annotations.addImage('cloud')
    expect(openPicker).toHaveBeenCalledWith()
  })
})
