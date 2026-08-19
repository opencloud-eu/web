import { isTrashResource } from '@opencloud-eu/web-client'
import { FileAction, FileActionOptions, useClientService, useMessages } from '@opencloud-eu/web-pkg'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

export const useFileActionsOpenShortcut = () => {
  const { showErrorMessage } = useMessages()
  const { $gettext } = useGettext()
  const clientService = useClientService()

  const extractUrl = (fileContents: string) => {
    const regex = /URL=(.+)/
    const match = fileContents.match(regex)

    if (match && match[1]) {
      return match[1]
    } else {
      throw new Error('unable to extract url')
    }
  }

  const handler = async ({ resources, space }: FileActionOptions) => {
    try {
      const webURL = new URL(window.location.href)
      const fileContents = (await clientService.webdav.getFileContents(space, resources[0])).body
      let url = extractUrl(fileContents)

      url = url.match(/^http[s]?:\/\//) ? url : `https://${url}`
      url = url.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '')

      if (url.startsWith(webURL.origin)) {
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
