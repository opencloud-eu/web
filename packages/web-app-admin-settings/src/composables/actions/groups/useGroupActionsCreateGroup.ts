import { useModals, UserAction } from '@opencloud-eu/web-pkg'
import { computed, markRaw } from 'vue'
import { useGettext } from 'vue3-gettext'
import CreateGroupModal from '../../../components/Groups/CreateGroupModal.vue'

export const useGroupActionsCreateGroup = () => {
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()

  const actions = computed((): UserAction[] => [
    {
      name: 'create-group',
      icon: 'add',
      class: 'oc-groups-actions-create-group',
      label: () => $gettext('New group'),
      isVisible: () => true,
      handler: () => {
        dispatchModal({
          title: $gettext('Create group'),
          customComponent: markRaw(CreateGroupModal)
        })
      }
    }
  ])

  return {
    actions
  }
}
