import { Resource } from '@opencloud-eu/web-client'

export type MediaFile = {
  id: string
  name: string
  url?: string
  ext: string
  mimeType: string
  isVideo: boolean
  isImage: boolean
  isAudio: boolean
  isLoading: boolean
  isError: boolean
  resource: Resource
}
