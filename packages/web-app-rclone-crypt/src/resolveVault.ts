import { FolderVaultClaim, FolderVaultEngine, useFolderVaultStore } from '@opencloud-eu/web-pkg'
import {
  isPersonalSpaceResource,
  isProjectSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { createEngine } from './crypto/engine'
import { findVaultRoot } from './vaultPath'

function isSupportedSpace(space: SpaceResource): boolean {
  // PoC: only personal and project spaces. Public links, shares, trash etc.
  // are out of scope for the first read iteration.
  return isPersonalSpaceResource(space) || isProjectSpaceResource(space)
}

/**
 * Returns the vault root + the route the runtime should push to in order
 * to unlock this vault. Used by the UI to detect "locked vault, please
 * route the user to the plugin's unlock page" — even when `resolveVault`
 * itself returns null because no passphrase is in the store yet.
 */
export function claimsVaultPath(space: SpaceResource, path: string): FolderVaultClaim | null {
  if (!isSupportedSpace(space) || !path) {
    return null
  }
  const vaultRoot = findVaultRoot(path)
  if (!vaultRoot) {
    return null
  }
  return {
    vaultRoot,
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
 * Build a usable engine for (space, path) — or return null if the vault is
 * not unlocked yet. The plugin's unlock page is responsible for writing the
 * passphrase into the folder-vault store; once that's there, this function
 * picks it up.
 */
export function resolveVault(space: SpaceResource, path: string): FolderVaultEngine | null {
  if (!isSupportedSpace(space) || !path) {
    return null
  }
  const vaultRoot = findVaultRoot(path)
  if (!vaultRoot) {
    return null
  }
  const vaultStore = useFolderVaultStore()
  const password = vaultStore.getSecret<string>(space.id, vaultRoot)
  if (!password) {
    return null
  }
  return createEngine(space.id, vaultRoot, password)
}
