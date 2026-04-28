import { FileAction, FileActionOptions } from '@opencloud-eu/web-pkg'
import { computed, unref, Ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useModals } from '@opencloud-eu/web-pkg'
import { SaveAsModal } from '@opencloud-eu/web-pkg'
import { useFolderLink } from '@opencloud-eu/web-pkg'
import { useIsFilesAppActive } from '@opencloud-eu/web-pkg'

export const useFileActionsSaveAs = ({ content }: { content: Ref<unknown> }) => {
  const { $gettext } = useGettext()
  const isFilesAppActive = useIsFilesAppActive()
  const { dispatchModal } = useModals()
  const { getParentFolderLink } = useFolderLink()

  const handler = ({ resources }: FileActionOptions) => {
    const parentFolderLink = getParentFolderLink(resources[0])

    dispatchModal({
      elementClass: 'save-as-modal',
      title: $gettext('Save as'),
      customComponent: SaveAsModal,
      hideActions: true,
      customComponentAttrs: () => ({
        content: unref(content),
        parentFolderLink,
        originalResource: resources[0]
      }),
      focusTrapInitial: false
    })
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'save-as',
      icon: 'save-2',
      handler,
      label: () => {
        return $gettext('Save as')
      },
      isVisible: ({ resources }) => {
        return !unref(isFilesAppActive) || resources.length !== 1
      },
      class: 'oc-files-actions-save-as-trigger'
    }
  ])

  return {
    actions
  }
}
