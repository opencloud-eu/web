import { FolderVaultClaim, FolderVaultEngine, useFolderVaultStore } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { vaultRootForSpace } from './vaultPath'

/**
 * Returns the vault root + the route the runtime should push to in order
 * to unlock this vault. Used by the UI to detect "locked vault, please
 * route the user to the plugin's unlock page" - even when `resolveVault`
 * itself returns null because no engine is in the store yet.
 */
export function claimsVaultPath(space: SpaceResource, path: string): FolderVaultClaim | null {
  if (!path) {
    return null
  }
  const vaultRoot = vaultRootForSpace(space, path)
  if (!vaultRoot) {
    return null
  }
  return {
    vaultRoot,
    // rclone-crypt encrypts all path segment names (EME), not just content.
    encryptsNames: true,
    unlockRoute: {
      name: 'rclone-crypt-unlock',
      query: {
        spaceId: space.id,
        vaultRoot
      }
    }
  }
}

/**
 * Look up the unlocked engine for (space, path) - or return null when the
 * vault isn't unlocked yet. The plugin's unlock page builds the engine and
 * writes it into the folder-vault store; this function just reads it back.
 */
export function resolveVault(space: SpaceResource, path: string): FolderVaultEngine | null {
  if (!path) {
    return null
  }
  const vaultRoot = vaultRootForSpace(space, path)
  if (!vaultRoot) {
    return null
  }
  return useFolderVaultStore().getEngine(space.id, vaultRoot) ?? null
}
