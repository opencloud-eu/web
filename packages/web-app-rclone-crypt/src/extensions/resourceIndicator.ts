import {
  ResourceIndicator,
  ResourceIndicatorExtension,
  useFolderVaultStore
} from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'

// Find the `*.vault` segment in a path. Returns the cleartext root (e.g.
// `/myvault.vault`) when the resource sits inside or on a vault, else null.
function findVaultRoot(path: string | undefined): string | null {
  if (!path) return null
  const segments = path.split('/').filter(Boolean)
  const idx = segments.findIndex((s) => s.endsWith('.vault'))
  if (idx === -1) return null
  return '/' + segments.slice(0, idx + 1).join('/')
}

export const resourceIndicatorExtension: ResourceIndicatorExtension = {
  id: 'app.rclone-crypt.indicator',
  type: 'resourceIndicator',
  extensionPointIds: ['global.files.resource-indicator'],
  getResourceIndicators(resource: Resource): ResourceIndicator[] | void {
    const vaultRoot = findVaultRoot(resource.path)
    if (!vaultRoot) {
      return
    }

    const vaultStore = useFolderVaultStore()
    const unlocked = vaultStore.isUnlocked(resource.storageId as string, vaultRoot)

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
            ? 'This vault is unlocked in your session'
            : 'This vault is locked',
          label: unlocked ? 'Vault unlocked' : 'Vault locked',
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
        accessibleDescription: 'This item is inside an unlocked vault',
        label: 'Vault unlocked',
        icon: 'lock-unlock',
        fillType: 'line',
        category: 'system',
        type: 'vault-unlocked'
      }
    ]
  }
}
