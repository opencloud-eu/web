import { useGettext } from 'vue3-gettext'
import {
  getVaultClaim,
  ResourceIndicator,
  ResourceIndicatorExtension,
  useExtensionRegistry,
  useFolderVaultStore,
  useGetMatchingSpace
} from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'

// Scheme-agnostic vault status indicator: the padlock and its locked/unlocked
// state come entirely from the folder-vault store + the claim a folder-vault
// extension reports, so this works for any scheme, not just rclone-crypt.
export const useFolderVaultIndicator = (): ResourceIndicatorExtension => {
  const { $gettext } = useGettext()
  const vaultStore = useFolderVaultStore()
  const extensionRegistry = useExtensionRegistry()
  const { getMatchingSpace } = useGetMatchingSpace()

  return {
    id: 'com.github.opencloud-eu.web.files.folder-vault-indicator',
    type: 'resourceIndicator',
    extensionPointIds: ['global.files.resource-indicator'],
    getResourceIndicators(resource: Resource): ResourceIndicator[] | void {
      // Cheap early-out on the hot path: markVaultStatus flags every vault
      // resource, so non-vault resources skip the claim/space lookup entirely.
      if (!resource.isInVault || !resource.storageId) {
        return
      }
      const space = getMatchingSpace(resource)
      const claim = space ? getVaultClaim(extensionRegistry, space, resource.path) : null
      if (!claim) {
        return
      }

      const vaultRoot = claim.vaultRoot
      const unlocked = vaultStore.isUnlocked(resource.storageId, vaultRoot)

      // The vault-root resource itself is what users see when browsing the
      // parent folder - show open vs. closed lock so the unlock state is
      // obvious without entering the vault first.
      const isVaultRoot = resource.path === vaultRoot

      if (isVaultRoot) {
        return [
          {
            id: `vault-state-${resource.getDomSelector?.() ?? resource.id}`,
            kind: 'icon',
            accessibleDescription: unlocked
              ? $gettext('This vault is unlocked in your session')
              : $gettext('This vault is locked'),
            label: unlocked ? $gettext('Vault unlocked') : $gettext('Vault locked'),
            // Closed padlock = solid filled, open padlock = outline. The
            // fill/line contrast is what users actually notice at this size;
            // same icon family with different fill state alone is too subtle.
            icon: unlocked ? 'lock-unlock' : 'lock-2',
            fillType: unlocked ? 'line' : 'fill',
            category: 'system',
            type: unlocked ? 'vault-unlocked' : 'vault-locked'
          }
        ]
      }

      // Resources inside a vault: only annotate when the vault is actually
      // unlocked (otherwise the user wouldn't be here in the first place - the
      // unlock guard intercepts before any listing renders).
      if (!unlocked) {
        return
      }
      return [
        {
          id: `vault-unlocked-${resource.getDomSelector?.() ?? resource.id}`,
          kind: 'icon',
          accessibleDescription: $gettext('This item is inside an unlocked vault'),
          label: $gettext('Vault unlocked'),
          icon: 'lock-unlock',
          fillType: 'line',
          category: 'system',
          type: 'vault-unlocked'
        }
      ]
    }
  }
}
