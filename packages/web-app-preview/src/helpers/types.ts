import { Ref } from 'vue'

export type CachedFile = {
  id: string
  name: string
  url?: Ref<string>
  ext: string
  mimeType: string
  isVideo: boolean
  isImage: boolean
  isAudio: boolean
  isLoading: Ref<boolean>
  isError: Ref<boolean>
}
