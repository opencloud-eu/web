import { useGettext } from 'vue3-gettext'
import { computed } from 'vue'
import { GroupAction, useSideBar } from '@opencloud-eu/web-pkg'

export const useGroupActionsEdit = () => {
  const { $gettext } = useGettext()
  const { openSideBarPanel } = useSideBar()

  const actions = computed((): GroupAction[] => [
    {
      name: 'edit',
      icon: 'pencil',
      label: () => $gettext('Edit'),
      handler: () => openSideBarPanel('EditPanel'),
      isVisible: ({ resources }) => {
        return resources.length === 1 && !resources[0].groupTypes?.includes('ReadOnly')
      },
      class: 'oc-groups-actions-edit-trigger'
    }
  ])

  return {
    actions
  }
}
