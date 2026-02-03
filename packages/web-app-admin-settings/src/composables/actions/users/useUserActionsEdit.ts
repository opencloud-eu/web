import { useGettext } from 'vue3-gettext'
import { computed } from 'vue'
import { UserAction, useSideBar } from '@opencloud-eu/web-pkg'

export const useUserActionsEdit = () => {
  const { $gettext } = useGettext()
  const { openSideBarPanel } = useSideBar()

  const actions = computed((): UserAction[] => [
    {
      name: 'edit',
      icon: 'pencil',
      label: () => $gettext('Edit'),
      handler: () => openSideBarPanel('EditPanel'),
      isVisible: ({ resources }) => {
        return resources.length === 1
      },
      class: 'oc-users-actions-edit-trigger'
    }
  ])

  return {
    actions
  }
}
