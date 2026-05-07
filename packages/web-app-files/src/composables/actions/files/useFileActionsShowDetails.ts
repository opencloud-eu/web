import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { FileAction, useResourcesStore, useSideBar } from '@opencloud-eu/web-pkg'

export const useFileActionsShowDetails = () => {
  const resourcesStore = useResourcesStore()
  const { openSideBar } = useSideBar()
  const { $gettext } = useGettext()

  const actions = computed((): FileAction[] => [
    {
      name: 'show-details',
      icon: 'information',
      category: 'quaternary',
      class: 'oc-files-actions-show-details-trigger',
      label: () => $gettext('Details'),
      isVisible: ({ resources }) => {
        return resources.length > 0
      },
      handler({ resources }) {
        resourcesStore.setSelection(resources.map(({ id }) => id))
        openSideBar()
      }
    }
  ])

  return {
    actions
  }
}
