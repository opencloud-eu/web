import { useGettext } from 'vue3-gettext'
import {
  ResourceIndicator,
  ResourceIndicatorExtension,
  useFolderVaultStore
} from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { findVaultRoot } from '../vaultPath'

export function useResourceIndicatorExtension(): ResourceIndicatorExtension {
  const { $gettext } = useGettext()
  const vaultStore = useFolderVaultStore()

  return {
    id: 'app.rclone-crypt.indicator',
    type: 'resourceIndicator',
    extensionPointIds: ['global.files.resource-indicator'],
    getResourceIndicators(resource: Resource): ResourceIndicator[] | void {
      const vaultRoot = findVaultRoot(resource.path)
      if (!vaultRoot || !resource.storageId) {
        return
      }

      const unlocked = vaultStore.isUnlocked(resource.storageId, vaultRoot)

      // The vault-root resource itself is what users see when browsing the
      // parent folder — show open vs. closed lock so the unlock state is
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
      // unlocked (otherwise the user wouldn't be here in the first place — the
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
