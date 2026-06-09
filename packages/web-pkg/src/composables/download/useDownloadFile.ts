import { useClientService } from '../clientService'
import { resolveFolderVault, streamToBlob, triggerDownloadWithFilename } from '../../../src/helpers'
import { useGettext } from 'vue3-gettext'
import { ClientService } from '../../services'
import { useExtensionRegistry, useMessages, useUserStore } from '../piniaStores'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGetMatchingSpace } from '../spaces'

export interface DownloadFileOptions {
  clientService?: ClientService
}

export const useDownloadFile = (options?: DownloadFileOptions) => {
  const { showErrorMessage } = useMessages()
  const { getMatchingSpace } = useGetMatchingSpace()
  const clientService = options?.clientService || useClientService()
  const { $gettext } = useGettext()
  const userStore = useUserStore()
  const extensionRegistry = useExtensionRegistry()

  const downloadFile = async (
    space: SpaceResource = null,
    file: Resource,
    version: string = null
  ) => {
    try {
      if (!space) {
        space = getMatchingSpace(file)
      }

      // Vault files are stored as ciphertext blobs; the plain download URL
      // would hand the user an unreadable encrypted file. Get the cleartext
      // bytes and download those as an in-memory blob instead. Gate on the
      // cheap `isInVault` flag (set by markVaultStatus on every listing, and
      // carried by a file's versions too) so non-vault downloads skip the
      // async engine resolution entirely.
      const vaultEngine = file.isInVault
        ? await resolveFolderVault(extensionRegistry, space, file.path)
        : null
      if (vaultEngine) {
        let blob: Blob
        if (version) {
          // A version lives at a signed meta URL (getFileUrl), which serves the
          // ciphertext blob. getFileUrl returns a URL, not bytes, so the
          // vault-aware client can't help - fetch and decrypt it ourselves.
          const versionUrl = await clientService.webdav.getFileUrl(space, file, {
            version,
            username: userStore.user?.onPremisesSamAccountName
          })
          const encryptedBytes = await (await fetch(versionUrl)).arrayBuffer()
          blob = await streamToBlob(
            vaultEngine.decryptContent(new Blob([encryptedBytes]).stream()),
            file.mimeType || 'application/octet-stream'
          )
        } else {
          // The current file goes through the vault-aware webdav client, which
          // returns the decrypted bytes.
          const response = await clientService.webdav.getFileContents(
            space,
            { path: file.path },
            { responseType: 'arraybuffer' }
          )
          blob = new Blob([response.body as ArrayBuffer], {
            type: file.mimeType || 'application/octet-stream'
          })
        }
        const blobUrl = URL.createObjectURL(blob)
        triggerDownloadWithFilename(blobUrl, file.name)
        // hold the object URL long enough for the browser to read it, then free it
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
        return
      }

      const url = await clientService.webdav.getFileUrl(space, file, {
        version,
        username: userStore.user?.onPremisesSamAccountName
      })
      triggerDownloadWithFilename(url, file.name)
    } catch (e) {
      console.error(e)
      showErrorMessage({
        title: $gettext('Download failed'),
        desc: $gettext('File could not be located'),
        errors: [e]
      })
    }
  }

  return {
    downloadFile
  }
}
