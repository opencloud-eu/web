import { FolderVaultExtension } from '@opencloud-eu/web-pkg'
import { claimsVaultPath, resolveVault } from '../resolveVault'

export const folderVaultExtension: FolderVaultExtension = {
  id: 'app.rclone-crypt.folder-vault',
  type: 'folderVault',
  // rclone-crypt has no per-vault index to load, so this resolves
  // synchronously and the async wrapper just returns a resolved promise.
  async resolve(space, path) {
    return resolveVault(space, path)
  },
  claimsPath(space, path) {
    return claimsVaultPath(space, path)
  }
}
