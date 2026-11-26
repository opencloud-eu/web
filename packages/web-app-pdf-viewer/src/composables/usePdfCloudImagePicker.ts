import { computed, markRaw, toValue, type MaybeRefOrGetter } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SupportedImageMimeTypes } from 'pdfjs-dist'
import type { Resource } from '@opencloud-eu/web-client'
import {
  FilePickerModal,
  useClientService,
  useFolderLink,
  useGetMatchingSpace,
  useAuthStore,
  useMessages,
  useModals
} from '@opencloud-eu/web-pkg'

/**
 * Whether the cloud is offered as a source of images. On public links the file picker only shows
 * the shared files, so it is hidden there like in the text editor (see
 * https://github.com/opencloud-eu/web/pull/3632).
 */
export function useCanPickImageFromCloud() {
  const authStore = useAuthStore()
  return computed(() => !authStore.publicLinkContextReady)
}

/**
 * Lets the user pick an image from the cloud via OpenCloud's file picker, like the text
 * editor's "Insert image from cloud", and hands it over as a File.
 */
export function usePdfCloudImagePicker({
  resource,
  onImage
}: {
  resource: MaybeRefOrGetter<Resource>
  /** What to do with the image, unless `openPicker` gets something else, e.g. for signatures. */
  onImage: (file: File) => void
}) {
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()
  const { showErrorMessage } = useMessages()
  const clientService = useClientService()
  const { getMatchingSpace } = useGetMatchingSpace()
  const { getParentFolderLink } = useFolderLink()

  async function loadImage(image: Resource) {
    const { body } = await clientService.webdav.getFileContents(
      getMatchingSpace(image),
      { path: image.path },
      { responseType: 'arraybuffer' }
    )
    return new File([body as ArrayBuffer], image.name, { type: image.mimeType })
  }

  /** `types` limits the images, e.g. to raster images for signatures. */
  function openPicker(
    handleImage: (file: File) => void = onImage,
    types: string[] = [...SupportedImageMimeTypes]
  ) {
    dispatchModal({
      elementClass: 'file-picker-modal',
      title: $gettext('Insert image from cloud'),
      customComponent: markRaw(FilePickerModal),
      hideActions: true,
      focusTrapInitial: false,
      customComponentAttrs: () => ({
        allowedFileTypes: types,
        parentFolderLink: getParentFolderLink(toValue(resource)),
        callbackFn: async ({ resource: image }: { resource: Resource }) => {
          if (!types.includes(image.mimeType)) {
            return
          }
          try {
            handleImage(await loadImage(image))
          } catch (e) {
            console.error(e)
            showErrorMessage({ title: $gettext('Loading the image failed'), errors: [e as Error] })
          }
        }
      })
    })
  }

  return { openPicker }
}
