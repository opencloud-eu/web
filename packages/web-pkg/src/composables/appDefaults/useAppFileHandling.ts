import { unref } from 'vue'

import { Resource } from '@opencloud-eu/web-client'
import { MaybeRef } from '../../utils'
import { ClientService } from '../../services'
import { FileContext } from './types'
import { FileResource, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '../clientService'
import { ListFilesOptions } from '@opencloud-eu/web-client/webdav'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { useExtensionRegistry, useUserStore } from '../piniaStores'
import { resolveFolderVault } from '../../helpers/folderVault'

interface AppFileHandlingOptions {
  clientService: ClientService
}

export type FileContentOptions = {
  responseType?: 'arraybuffer' | 'blob' | 'text'
  signal?: AbortSignal
} & Record<string, any>
export type UrlForResourceOptions = Omit<Parameters<WebDAV['getFileUrl']>[2], 'isUrlSigningEnabled'>

export interface AppFileHandlingResult {
  getUrlForResource(
    space: SpaceResource,
    resource: Resource,
    options?: UrlForResourceOptions
  ): Promise<string>
  revokeUrl(url: string): void
  getFileInfo(fileContext: MaybeRef<FileContext>, options?: ListFilesOptions): Promise<Resource>
  getFileContents(fileContext: MaybeRef<FileContext>, options?: FileContentOptions): Promise<any>
  putFileContents(
    fileContext: MaybeRef<FileContext>,
    putFileOptions: { content?: string | ArrayBuffer } & Record<string, any>
  ): Promise<FileResource>
}

export function useAppFileHandling({
  clientService
}: AppFileHandlingOptions): AppFileHandlingResult {
  clientService = clientService || useClientService()
  const userStore = useUserStore()
  const extensionRegistry = useExtensionRegistry()

  const getUrlForResource = async (
    space: SpaceResource,
    resource: Resource,
    options?: UrlForResourceOptions
  ): Promise<string> => {
    // For vault resources, the server-side blob is ciphertext — neither a
    // direct download URL nor a thumbnail can render the actual image. Fetch
    // the encrypted blob, run it through the engine, and expose the cleartext
    // bytes as an in-memory blob URL the embedded app can consume directly.
    const vaultEngine = resolveFolderVault(extensionRegistry, space, resource?.path)
    if (vaultEngine) {
      const encryptedPath = await vaultEngine.encryptPath(resource.path)
      const response = await clientService.webdav.getFileContents(
        space,
        { path: encryptedPath },
        { responseType: 'arraybuffer', signal: options?.signal }
      )
      const encryptedBytes = new Uint8Array(response.body as ArrayBuffer)
      const encryptedStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encryptedBytes)
          controller.close()
        }
      })
      const plaintextStream = vaultEngine.decryptContent(encryptedStream)
      const reader = plaintextStream.getReader()
      const chunks: Uint8Array[] = []
      let total = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        total += value.byteLength
      }
      const plaintext = new Uint8Array(total)
      let offset = 0
      for (const c of chunks) {
        plaintext.set(c, offset)
        offset += c.byteLength
      }
      const blob = new Blob([plaintext as BlobPart], {
        type: resource.mimeType || 'application/octet-stream'
      })
      return URL.createObjectURL(blob)
    }
    return clientService.webdav.getFileUrl(space, resource, {
      username: userStore.user?.onPremisesSamAccountName,
      ...options
    })
  }

  const revokeUrl = (url: string) => {
    return clientService.webdav.revokeUrl(url)
  }

  // TODO: support query parameters
  const getFileContents = (
    fileContext: MaybeRef<FileContext>,
    options: { responseType?: 'arraybuffer' | 'blob' | 'text'; signal?: AbortSignal } & Record<
      string,
      any
    >
  ) => {
    return clientService.webdav.getFileContents(
      unref(unref(fileContext).space),
      {
        path: unref(unref(fileContext).item)
      },
      {
        ...options
      }
    )
  }

  const getFileInfo = (
    fileContext: MaybeRef<FileContext>,
    options: ListFilesOptions = {}
  ): Promise<Resource> => {
    return clientService.webdav.getFileInfo(
      unref(unref(fileContext).space),
      {
        path: unref(unref(fileContext).item),
        fileId: unref(unref(fileContext).itemId)
      },
      options
    )
  }

  const putFileContents = (
    fileContext: MaybeRef<FileContext>,
    options: { content?: string | ArrayBuffer; signal?: AbortSignal } & Record<string, any>
  ) => {
    return clientService.webdav.putFileContents(unref(unref(fileContext).space), {
      path: unref(unref(fileContext).item),
      ...options
    })
  }

  return {
    getUrlForResource,
    revokeUrl,
    getFileContents,
    getFileInfo,
    putFileContents
  }
}
