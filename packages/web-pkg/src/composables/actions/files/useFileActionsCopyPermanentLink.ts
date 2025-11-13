import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { FileAction } from '../types'
import { useClipboard } from '@vueuse/core'
import { useMessages } from '../../piniaStores'
import { isPublicSpaceResource, isTrashResource } from '@opencloud-eu/web-client'
import { useInterceptModifierClick } from '../../keyboardActions'
import { FileActionOptionsWithEvent } from './useFileActions'

export const useFileActionsCopyPermanentLink = () => {
  const { showMessage, showErrorMessage } = useMessages()
  const { $gettext } = useGettext()
  const { copy } = useClipboard()
  const { interceptModifierClick } = useInterceptModifierClick()

  const copyLinkToClipboard = async (url: string) => {
    try {
      await copy(url)
      showMessage({ title: $gettext('The link has been copied to your clipboard.') })
    } catch (e) {
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
      handler: (options: FileActionOptionsWithEvent) => {
        const { resources, event } = options
        const resource = resources[0]

        if (event && interceptModifierClick(event, resource)) {
          return
        }

        return copyLinkToClipboard(resource.privateLink)
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
