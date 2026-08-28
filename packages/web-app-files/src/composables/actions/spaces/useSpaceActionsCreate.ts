import { computed, markRaw } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SpaceAction, useAbility, useModals } from '@opencloud-eu/web-pkg'
import CreateSpaceModal from '../../../components/Modals/CreateSpaceModal.vue'

export const useSpaceActionsCreate = () => {
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()
  const { can } = useAbility()

  const actions = computed((): SpaceAction[] => [
    {
      name: 'create',
      icon: 'add',
      class: 'oc-files-actions-create-space-trigger',
      label: () => $gettext('New Space'),
      isVisible: () => can('create-all', 'Drive'),
      handler: () => {
        dispatchModal({
          title: $gettext('Create a new space'),
          focusTrapInitial: '#create-space-input',
          customComponent: markRaw(CreateSpaceModal),
          hideActions: true
        })
      }
    }
  ])

  return {
    actions
  }
}
