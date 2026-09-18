import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { dirname } from 'path'
import { isSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  createFileRouteOptions,
  ExtensionRegistry,
  FileAction,
  FileActionOptions,
  VaultClaim,
  getVaultClaim,
  useExtensionRegistry,
  useVaultStore,
  useGetMatchingSpace,
  useMessages,
  useResourcesStore,
  useRouter
} from '@opencloud-eu/web-pkg'

// Locking is scheme-agnostic: a vault counts as unlocked exactly when an engine
// sits in the vault store, and which resource is a vault root comes straight
// from the claim a vault extension reports via `getVaultClaim`. So the action
// lives with the generic file actions and works for any vault scheme, not just
// rclone-crypt. There is no counterpart for unlocking: entering a locked vault
// routes to the scheme's unlock UI on its own (see `setupVaultUnlockGuard`).
function claimForRoot(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource | undefined,
  resource: Resource | undefined
): VaultClaim | null {
  if (!space || !resource?.path) {
    return null
  }
  const claim = getVaultClaim(extensionRegistry, space, resource.path)
  // Only the root carries the lock affordance; content inside a vault is not a
  // thing you lock on its own.
  return claim && claim.vaultRoot === resource.path ? claim : null
}

export const useFileActionsLockVault = (): { actions: Ref<FileAction[]> } => {
  const { $gettext } = useGettext()
  const vaultStore = useVaultStore()
  const extensionRegistry = useExtensionRegistry()
  const { showMessage } = useMessages()
  const { getMatchingSpace } = useGetMatchingSpace()
  const resourcesStore = useResourcesStore()
  const router = useRouter()

  const actions = computed((): FileAction[] => [
    {
      name: 'lock-vault',
      icon: 'lock',
      iconFillType: 'line',
      label: () => $gettext('Lock vault'),
      category: 'tertiary',
      handler: ({ resources }: FileActionOptions) => {
        const resource = resources?.[0]
        const space = getMatchingSpace(resource)
        if (!claimForRoot(extensionRegistry, space, resource)) {
          return
        }
        const vaultRoot = resource.path
        vaultStore.clearEngine(space.id, vaultRoot)
        showMessage({
          title: $gettext('»%{vault}« was locked', { vault: resource.name })
        })
        // If the user is sitting inside the freshly-locked vault, bounce them to
        // its parent so they aren't left staring at ciphertext names. From
        // outside (clicked the vault entry in a parent listing) no redirect is
        // needed. Compare paths segment-wise - a bare substring match would also
        // fire for a sibling like `my.vault-notes` - and rebuild the route from
        // the space so multi-segment drive aliases survive.
        const driveAliasAndItem =
          (unref(router.currentRoute).params?.driveAliasAndItem as string | undefined) || ''
        const itemPath =
          '/' +
          (driveAliasAndItem.startsWith(space.driveAlias)
            ? driveAliasAndItem.slice(space.driveAlias.length)
            : driveAliasAndItem
          ).replace(/^\/+/, '')
        const insideVault =
          (itemPath === vaultRoot || itemPath.startsWith(`${vaultRoot}/`)) &&
          resourcesStore.currentFolder
        if (insideVault) {
          router.push(createFileRouteOptions(space, { path: dirname(vaultRoot) }))
        }
      },
      isVisible: ({ resources }: FileActionOptions) => {
        const resource = resources?.[0]
        if (isSpaceResource(resource)) {
          return false
        }
        const space = getMatchingSpace(resource)
        if (!claimForRoot(extensionRegistry, space, resource)) {
          return false
        }
        return vaultStore.isUnlocked(space.id, resource.path)
      },
      class: 'oc-files-actions-lock-vault'
    }
  ])

  return { actions }
}
