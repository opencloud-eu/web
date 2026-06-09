import { FolderVaultExtension } from '@opencloud-eu/web-pkg'
import { claimsVaultPath, resolveVault } from '../resolveVault'

export const folderVaultExtension: FolderVaultExtension = {
  id: 'app.rclone-crypt.folder-vault',
  type: 'folderVault',
  resolve(space, path) {
    return resolveVault(space, path)
  },
  claimsPath(space, path) {
    return claimsVaultPath(space, path)
  }
}
