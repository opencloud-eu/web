import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SpaceResource } from '@opencloud-eu/web-client'
import {
  ExtensionRegistry,
  VaultClaim,
  getVaultClaim,
  SpaceAction,
  SpaceActionOptions,
  useExtensionRegistry,
  useVaultStore,
  useMessages,
  useRoute,
  useRouter
} from '@opencloud-eu/web-pkg'

/**
 * Space-level counterpart of `useFileActionsVaultLock`: an end-to-end encrypted
 * space is a vault rooted at the space root.
 */
const VAULT_ROOT = '/'

function claimForSpace(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource | undefined
): VaultClaim | null {
  if (!space) {
    return null
  }
  const claim = getVaultClaim(extensionRegistry, space, VAULT_ROOT)
  return claim?.vaultRoot === VAULT_ROOT ? claim : null
}

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
        if (!claimForSpace(extensionRegistry, space)) {
          return
        }
        vaultStore.clearEngine(space.id, VAULT_ROOT)
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
        if (resources?.length !== 1 || !claimForSpace(extensionRegistry, space)) {
          return false
        }
        if (space.disabled) {
          return false
        }
        return vaultStore.isUnlocked(space.id, VAULT_ROOT)
      },
      class: 'oc-files-actions-lock-vault-trigger'
    }
  ])

  return { actions }
}
