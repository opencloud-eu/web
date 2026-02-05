import { FileAction, FileActionOptions } from '../types'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useDownloadFile } from '../../download'
import { useModals } from '../../piniaStores'
import { useFileActionsDownloadFile } from './useFileActionsDownloadFile'

export const useFileActionFallbackToDownload = () => {
  const { $gettext } = useGettext()
  const { actions: downloadFileActions } = useFileActionsDownloadFile()
  const { downloadFile } = useDownloadFile()
  const { dispatchModal } = useModals()
  const handler = ({ space, resources }: FileActionOptions) => {
    dispatchModal({
      title: $gettext('No preview available for »%{name}«', { name: resources[0].name }),
      confirmText: $gettext('Download'),
      message: $gettext(
        'There is no preview available for this file. Do you want to download it instead?'
      ),
      onConfirm: () => {
        downloadFile(space, resources[0])
      }
    })
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'fallback-to-download',
      icon: 'file-download',
      handler,
      label: () => {
        return $gettext('Download')
      },
      isVisible: (options) => {
        return unref(downloadFileActions)[0].isVisible(options)
      },
      class: 'oc-files-actions-fallback-to-download-trigger'
    }
  ])

  return {
    actions
  }
}
