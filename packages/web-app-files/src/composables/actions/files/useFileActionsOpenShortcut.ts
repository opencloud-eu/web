import { isTrashResource } from '@opencloud-eu/web-client'
import {
  FileAction,
  FileActionOptions,
  getShortcutUrl,
  useClientService,
  useMessages
} from '@opencloud-eu/web-pkg'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

export function useFileActionsOpenShortcut() {
  const { showErrorMessage } = useMessages()
  const { $gettext } = useGettext()
  const clientService = useClientService()

  function extractUrl(fileContents: string) {
    const url = fileContents.match(/^URL=([^\r\n]+)/m)?.[1]
    if (!url) {
      throw new Error('unable to extract url')
    }
    return url
  }

  async function handler({ resources, space }: FileActionOptions) {
    try {
      const webURL = new URL(window.location.href)
      const fileContents = (await clientService.webdav.getFileContents(space, resources[0])).body
      const url = getShortcutUrl(extractUrl(fileContents))
      if (!url) {
        throw new Error('invalid shortcut URL')
      }

      if (new URL(url).origin === webURL.origin) {
        window.location.href = url
        return
      }

      window.open(url)
    } catch (e) {
      console.error(e)
      showErrorMessage({
        title: $gettext('Failed to open shortcut'),
        errors: [e]
      })
    }
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'open-shortcut',
      icon: 'external-link',
      category: 'primary',
      hasPriority: true,
      handler,
      label: () => {
        return $gettext('Open shortcut')
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }
        if (resources[0].extension !== 'url') {
          return false
        }
        if (isTrashResource(resources[0])) {
          return false
        }
        return resources[0].canDownload()
      },
      class: 'oc-files-actions-open-short-cut-trigger'
    }
  ])

  return {
    actions,
    extractUrl
  }
}
