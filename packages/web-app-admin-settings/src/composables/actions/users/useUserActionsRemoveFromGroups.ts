import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { UserAction, useModals, useCapabilityStore, UserActionOptions } from '@opencloud-eu/web-pkg'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import RemoveFromGroupsModal from '../../../components/Users/RemoveFromGroupsModal.vue'

export const useUserActionsRemoveFromGroups = ({ groups }: { groups: Ref<Group[]> }) => {
  const { dispatchModal } = useModals()
  const { $gettext, $ngettext } = useGettext()
  const capabilityStore = useCapabilityStore()

  const handler = ({ resources }: UserActionOptions) => {
    dispatchModal({
      title: $ngettext(
        'Remove user "%{user}" from groups',
        'Remove %{userCount} users from groups ',
        resources.length,
        {
          user: resources[0].displayName,
          userCount: resources.length.toString()
        }
      ),
      customComponent: RemoveFromGroupsModal,
      customComponentAttrs: () => ({
        users: resources,
        groups: unref(groups)
      })
    })
  }

  const actions = computed((): UserAction[] => [
    {
      name: 'remove-users-from-groups',
      icon: 'subtract',
      class: 'oc-users-actions-remove-from-groups-trigger',
      label: () => $gettext('Remove from groups'),
      isVisible: ({ resources }) => {
        if (capabilityStore.graphUsersReadOnlyAttributes.includes('user.memberOf')) {
          return false
        }

        if (resources.every(({ memberOf }) => !memberOf?.length)) {
          return false
        }

        return resources.length > 0
      },
      handler
    }
  ])

  return {
    actions
  }
}
