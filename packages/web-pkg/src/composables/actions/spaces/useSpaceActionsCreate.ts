import { computed, markRaw } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SpaceAction } from '../types'
import { useCreateSpace } from '../../spaces'
import { useModals, useExtensionRegistry, VaultFinalize } from '../../piniaStores'
import { useAbility } from '@casl/vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { getVaultCreator } from '../../../helpers'
import CreateSpaceModal from '../../../components/Spaces/CreateSpaceModal.vue'

export const useSpaceActionsCreate = ({
  onSpaceCreated
}: {
  onSpaceCreated?: (space: SpaceResource) => void
} = {}) => {
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()
  const { can } = useAbility()
  const { addNewSpace } = useCreateSpace()
  const extensionRegistry = useExtensionRegistry()

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
          focusTrapInitial: '#create-space-input',
          customComponent: markRaw(CreateSpaceModal),
          hideActions: true,
          customComponentAttrs: () => ({
            vaultCreation: getVaultCreator(extensionRegistry)?.creation,
            callbackFn: async (
              name: string,
              options: { encrypt: boolean; finalizeVault?: VaultFinalize }
            ) => {
              const createdSpace = await addNewSpace(name, options)
              onSpaceCreated?.(createdSpace)
            }
          })
        })
      }
    }
  ])

  return {
    actions
  }
}
