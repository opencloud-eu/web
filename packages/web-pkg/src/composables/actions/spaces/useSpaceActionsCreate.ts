import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SpaceAction } from '../types'
import { useCreateSpace } from '../../spaces'
import { useIsResourceNameValid } from '../helpers'
import { useModals } from '../../piniaStores'
import { useAbility } from '@casl/vue'
import { SpaceResource } from '@opencloud-eu/web-client'

export const useSpaceActionsCreate = ({
  onSpaceCreated
}: {
  onSpaceCreated?: (space: SpaceResource) => void
} = {}) => {
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()
  const { can } = useAbility()
  const { isSpaceNameValid } = useIsResourceNameValid()
  const { addNewSpace } = useCreateSpace()

  const actions = computed((): SpaceAction[] => [
    {
      name: 'create',
      icon: 'add',
      class: 'oc-files-actions-create-space-trigger',
      label: () => $gettext('New Space'),
      isVisible: () => {
        return can('create-all', 'Drive')
      },
      handler: () => {
        dispatchModal({
          title: $gettext('Create a new space'),
          confirmText: $gettext('Create'),
          hasInput: true,
          inputLabel: $gettext('Space name'),
          inputValue: $gettext('New space'),
          inputRequiredMark: true,
          onConfirm: async (name: string) => {
            const createdSpace = await addNewSpace(name)
            onSpaceCreated?.(createdSpace)
          },
          onInput: (name: string, setError: (error: string) => void) => {
            const { isValid, error } = isSpaceNameValid(name)
            setError(isValid ? null : error)
          }
        })
      }
    }
  ])

  return {
    actions
  }
}
