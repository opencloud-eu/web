import { useModals, useCapabilityStore } from '@opencloud-eu/web-pkg'
import { computed, markRaw } from 'vue'
import { useGettext } from 'vue3-gettext'
import { UserAction } from '@opencloud-eu/web-pkg'
import CreateUserModal from '../../../components/Users/CreateUserModal.vue'

export const useUserActionsCreateUser = () => {
  const { dispatchModal } = useModals()
  const capabilityStore = useCapabilityStore()
  const { $gettext } = useGettext()

  const actions = computed((): UserAction[] => [
    {
      name: 'create-user',
      icon: 'add',
      class: 'oc-users-actions-create-user',
      label: () => $gettext('New user'),
      isVisible: () => !capabilityStore.graphUsersCreateDisabled,
      handler: () => {
        dispatchModal({
          title: $gettext('Create user'),
          customComponent: markRaw(CreateUserModal)
        })
      }
    }
  ])

  return {
    actions
  }
}
