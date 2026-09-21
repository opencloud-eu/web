import { useGettext } from 'vue3-gettext'
import { HttpError, SpaceResource } from '@opencloud-eu/web-client'
import { useCreateSpace, useMessages } from '@opencloud-eu/web-pkg'

export const useSpaceImage = () => {
  const { $gettext } = useGettext()
  const { showMessage, showErrorMessage } = useMessages()
  const { setSpaceImage } = useCreateSpace()

  /**
   * Saves a cropped image on an existing space and reports the outcome, so the
   * callers that hand a crop over don't have to.
   */
  async function saveSpaceImage(space: SpaceResource, content: ArrayBuffer) {
    try {
      await setSpaceImage(space, content)
      showMessage({ title: $gettext('Space image was set successfully') })
    } catch (error) {
      console.error(error)

      if (error instanceof HttpError && error.statusCode === 507) {
        showErrorMessage({
          title: $gettext('Failed to set space image'),
          desc: $gettext('Not enough quota to set the space image'),
          errors: [error]
        })
        return
      }

      showErrorMessage({
        title: $gettext('Failed to set space image'),
        errors: [error]
      })
    }
  }

  return { saveSpaceImage }
}
