import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  getSpaceVaultClaim,
  SPACE_VAULT_ROOT,
  SpaceAction,
  SpaceActionOptions,
  useExtensionRegistry,
  useVaultStore,
  useMessages,
  useRoute,
  useRouter
} from '@opencloud-eu/web-pkg'

export const useSpaceActionsLockVault = (): { actions: Ref<SpaceAction[]> } => {
  const { $gettext } = useGettext()
  const vaultStore = useVaultStore()
  const extensionRegistry = useExtensionRegistry()
  const { showMessage } = useMessages()
  const route = useRoute()
  const router = useRouter()

  const actions = computed((): SpaceAction[] => [
    {
      name: 'lock-vault',
      icon: 'lock',
      iconFillType: 'line',
      label: () => $gettext('Lock space'),
      category: 'tertiary',
      handler: ({ resources }: SpaceActionOptions) => {
        const space = resources?.[0]
        if (!getSpaceVaultClaim(extensionRegistry, space)) {
          return
        }
        vaultStore.clearEngine(space.id, SPACE_VAULT_ROOT)
        showMessage({
          title: $gettext('»%{space}« was locked', { space: space.name })
        })
        // Inside the freshly locked space there is nothing left to show, and
        // staying would only bounce the user off to the unlock page.
        if (unref(route).name === 'files-spaces-generic') {
          router.push({ name: 'files-spaces-projects' })
        }
      },
      isVisible: ({ resources }: SpaceActionOptions) => {
        const space = resources?.[0]
        if (resources?.length !== 1 || !getSpaceVaultClaim(extensionRegistry, space)) {
          return false
        }
        if (space.disabled) {
          return false
        }
        return vaultStore.isUnlocked(space.id, SPACE_VAULT_ROOT)
      },
      class: 'oc-files-actions-lock-vault-trigger'
    }
  ])

  return { actions }
}
