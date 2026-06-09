import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { dirname } from 'path'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  createFileRouteOptions,
  ExtensionRegistry,
  FileAction,
  FileActionOptions,
  FolderVaultClaim,
  getVaultClaim,
  useExtensionRegistry,
  useFolderVaultStore,
  useGetMatchingSpace,
  useMessages,
  useRouter
} from '@opencloud-eu/web-pkg'

// Lock and unlock are scheme-agnostic: a vault counts as unlocked exactly when
// an engine sits in the folder-vault store, and the per-scheme bits (which
// resource is a vault root, where the unlock UI lives) come straight from the
// claim a folder-vault extension reports via `getVaultClaim`. So these actions
// live with the generic file actions and work for any folder-vault scheme, not
// just rclone-crypt.
function claimForRoot(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource | undefined,
  resource: Resource | undefined
): FolderVaultClaim | null {
  if (!space || !resource?.path) {
    return null
  }
  const claim = getVaultClaim(extensionRegistry, space, resource.path)
  // Only the root carries the lock/unlock affordance; content inside a vault
  // is not a thing you lock on its own.
  return claim && claim.vaultRoot === resource.path ? claim : null
}

export const useFileActionsLockVault = (): { actions: Ref<FileAction[]> } => {
  const { $gettext } = useGettext()
  const vaultStore = useFolderVaultStore()
  const extensionRegistry = useExtensionRegistry()
  const { showMessage } = useMessages()
  const { getMatchingSpace } = useGetMatchingSpace()
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
        vaultStore.clearEngine(resource.storageId, vaultRoot)
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
        const insideVault = itemPath === vaultRoot || itemPath.startsWith(`${vaultRoot}/`)
        if (insideVault) {
          router.push(createFileRouteOptions(space, { path: dirname(vaultRoot) }))
        }
      },
      isVisible: ({ resources }: FileActionOptions) => {
        const resource = resources?.[0]
        const space = getMatchingSpace(resource)
        if (!claimForRoot(extensionRegistry, space, resource)) {
          return false
        }
        return vaultStore.isUnlocked(resource.storageId, resource.path)
      },
      class: 'oc-files-actions-lock-vault'
    }
  ])

  return { actions }
}

export const useFileActionsUnlockVault = (): { actions: Ref<FileAction[]> } => {
  const { $gettext } = useGettext()
  const vaultStore = useFolderVaultStore()
  const extensionRegistry = useExtensionRegistry()
  const { getMatchingSpace } = useGetMatchingSpace()
  const router = useRouter()

  const actions = computed((): FileAction[] => [
    {
      name: 'unlock-vault',
      icon: 'lock-unlock',
      iconFillType: 'line',
      label: () => $gettext('Unlock vault'),
      category: 'tertiary',
      handler: ({ resources }: FileActionOptions) => {
        const resource = resources?.[0]
        const space = getMatchingSpace(resource)
        const claim = claimForRoot(extensionRegistry, space, resource)
        if (!claim?.unlockRoute) {
          return
        }
        // Send the user through the scheme's unlock UI but bring them back to
        // the current (parent) location, not into the vault. That keeps the
        // surrounding listing in view - the vault entry just flips from locked
        // to unlocked. The claim already carries the route + its query (space,
        // vault root); we only add where to return to.
        const redirectUrl = unref(router.currentRoute).fullPath
        router.push({
          ...claim.unlockRoute,
          query: { ...claim.unlockRoute.query, redirectUrl }
        })
      },
      isVisible: ({ resources }: FileActionOptions) => {
        const resource = resources?.[0]
        const space = getMatchingSpace(resource)
        const claim = claimForRoot(extensionRegistry, space, resource)
        if (!claim?.unlockRoute) {
          return false
        }
        return !vaultStore.isUnlocked(resource.storageId, resource.path)
      },
      class: 'oc-files-actions-unlock-vault'
    }
  ])

  return { actions }
}
