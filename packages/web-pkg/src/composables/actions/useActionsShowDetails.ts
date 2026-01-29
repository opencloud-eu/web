import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useSideBar } from '../piniaStores'
import { Action } from './types'

export const useActionsShowDetails = () => {
  const { $gettext } = useGettext()
  const { openSideBar } = useSideBar()

  const actions = computed((): Action[] => [
    {
      name: 'show-details',
      icon: 'information',
      label: () => $gettext('Details'),
      handler: () => openSideBar(),
      isVisible: ({ resources }) => {
        return (resources as unknown[]).length > 0
      },
      class: 'oc-admin-settings-show-details-trigger'
    }
  ])

  return {
    actions
  }
}
