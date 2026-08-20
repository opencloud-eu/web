import { isTrashResource } from '@opencloud-eu/web-client'
import { FileAction, FileActionOptions } from '../types'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useDownloadFile } from '../../download'

export const useFileActionsDownloadFile = () => {
  const { $gettext } = useGettext()
  const { downloadFile } = useDownloadFile()
  const handler = ({ space, resources }: FileActionOptions) => {
    downloadFile(space, resources[0])
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'download-file',
      icon: 'file-download',
      handler,
      label: () => {
        return $gettext('Download')
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }
        if (resources[0].isFolder) {
          return false
        }
        if (isTrashResource(resources[0])) {
          return false
        }
        return resources[0].canDownload()
      },
      class: 'oc-files-actions-download-file-trigger'
    }
  ])

  return {
    actions
  }
}
