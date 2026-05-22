import { computed, markRaw, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { UserAction, useModals, useCapabilityStore, UserActionOptions } from '@opencloud-eu/web-pkg'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import AddToGroupsModal from '../../../components/Users/AddToGroupsModal.vue'

export const useUserActionsAddToGroups = ({ groups }: { groups: Ref<Group[]> }) => {
  const { dispatchModal } = useModals()
  const { $gettext, $ngettext } = useGettext()
  const capabilityStore = useCapabilityStore()

  const handler = ({ resources }: UserActionOptions) => {
    dispatchModal({
      title: $ngettext(
        'Add user "%{user}" to groups',
        'Add %{userCount} users to groups ',
        resources.length,
        {
          user: resources[0].displayName,
          userCount: resources.length.toString()
        }
      ),
      customComponent: markRaw(AddToGroupsModal),
      customComponentAttrs: () => ({
        users: resources,
        groups: unref(groups)
      })
    })
  }

  const actions = computed((): UserAction[] => [
    {
      name: 'add-to-groups',
      icon: 'add',
      class: 'oc-users-actions-add-to-groups-trigger',
      label: () => $gettext('Add to groups'),
      isVisible: ({ resources }) => {
        if (capabilityStore.graphUsersReadOnlyAttributes.includes('user.memberOf')) {
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
