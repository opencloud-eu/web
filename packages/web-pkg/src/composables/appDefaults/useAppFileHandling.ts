import { unref } from 'vue'

import { Resource } from '@opencloud-eu/web-client'
import { MaybeRef } from '../../utils'
import { ClientService } from '../../services'
import { FileContext } from './types'
import { FileResource, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '../clientService'
import { ListFilesOptions } from '@opencloud-eu/web-client/webdav'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { useUserStore } from '../piniaStores'

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

  const getUrlForResource = async (
    space: SpaceResource,
    resource: Resource,
    options?: UrlForResourceOptions
  ): Promise<string> => {
    // A vault resource's server blob is ciphertext, so a plain download URL (or
    // thumbnail) would render garbage. Fetch the bytes through the vault-aware
    // webdav client (which decrypts them) and expose the cleartext as an
    // in-memory blob URL the embedded app can consume directly.
    if (resource.isInVault) {
      const response = await clientService.webdav.getFileContents(
        space,
        { path: resource.path },
        { responseType: 'arraybuffer', signal: options?.signal }
      )
      const blob = new Blob([response.body as ArrayBuffer], {
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
