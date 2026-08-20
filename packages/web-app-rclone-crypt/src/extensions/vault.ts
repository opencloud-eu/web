import { markRaw } from 'vue'
import { VaultExtension } from '@opencloud-eu/web-pkg'
import { claimsVaultPath, resolveVault } from '../resolveVault'
import { VAULT_CONTENT_TYPE, VAULT_EXTENSION } from '../vaultLocation'
import VaultSetup from '../components/VaultSetup.vue'

export const vaultSchemeExtension: VaultExtension = {
  id: 'app.rclone-crypt.vault',
  type: 'vault',
  // rclone-crypt has no per-vault index to load, so this resolves
  // synchronously and the async wrapper just returns a resolved promise.
  resolve(space, path) {
    return Promise.resolve(resolveVault(space, path))
  },
  claimsPath(space, path) {
    return claimsVaultPath(space, path)
  },
  creation: {
    vaultExtension: VAULT_EXTENSION,
    vaultContentType: VAULT_CONTENT_TYPE,
    setupComponent: markRaw(VaultSetup)
  }
}
