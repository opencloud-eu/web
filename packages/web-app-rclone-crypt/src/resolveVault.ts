import { VaultClaim, VaultEngine, useVaultStore } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { vaultRootForSpace } from './vaultLocation'

// EME pads a name to the next 16-byte block (PKCS#7, always at least one byte)
// and base32 encodes it, so 143 bytes -> 144 -> 231 chars, while 144 bytes ->
// 160 -> 256 chars would exceed the server's 255-byte name limit.
const MAX_NAME_BYTES = 143

/**
 * Returns the vault root + the route the runtime should push to in order
 * to unlock this vault. Used by the UI to detect "locked vault, please
 * route the user to the plugin's unlock page" - even when `resolveVault`
 * itself returns null because no engine is in the store yet.
 */
export function claimsVaultPath(space: SpaceResource, path: string): VaultClaim | null {
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
    maxNameBytes: MAX_NAME_BYTES,
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
 * writes it into the vault store; this function just reads it back.
 */
export function resolveVault(space: SpaceResource, path: string): VaultEngine | null {
  if (!path) {
    return null
  }
  const vaultRoot = vaultRootForSpace(space, path)
  if (!vaultRoot) {
    return null
  }
  return useVaultStore().getEngine(space.id, vaultRoot) ?? null
}
