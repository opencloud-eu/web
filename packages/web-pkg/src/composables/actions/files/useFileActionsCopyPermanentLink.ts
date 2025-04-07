import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { FileAction } from '../types'
import { useClipboard } from '../../clipboard'
import { useMessages } from '../../piniaStores'
import { isPublicSpaceResource, isTrashResource } from '@opencloud-eu/web-client'

export const useFileActionsCopyPermanentLink = () => {
  const { showMessage, showErrorMessage } = useMessages()
  const { $gettext } = useGettext()
  const { copyToClipboard } = useClipboard()

  const copyLinkToClipboard = async (url: string) => {
    try {
      await copyToClipboard(url)
      showMessage({ title: $gettext('The link has been copied to your clipboard.') })
    } catch (e) {
      console.error(e)
      showErrorMessage({
        title: $gettext('Copy link failed'),
        errors: [e]
      })
    }
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'copy-permanent-link',
      icon: 'link',
      label: () => $gettext('Copy permanent link'),
      handler: ({ resources }) => {
        const [resource] = resources
        const permalink = resource.privateLink
        return copyLinkToClipboard(permalink)
      },
      isVisible: ({ space, resources }) => {
        if (resources.length !== 1) {
          return false
        }

        if (isPublicSpaceResource(space)) {
          return false
        }

        if (isTrashResource(resources[0])) {
          return false
        }

        return true
      },
      class: 'oc-files-actions-copy-permanent-link-trigger'
    }
  ])

  return {
    actions
  }
}
