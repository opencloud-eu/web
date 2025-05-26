import PQueue from 'p-queue'
import { computed, onUnmounted, Ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import {
  buildSpaceImageResource,
  isProjectSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { FolderViewModeConstants } from '../viewMode'
import { usePreviewService } from '../previewService'
import { ProcessorType } from '../../services'
import { useAvatarsStore, useConfigStore, useResourcesStore, useSpacesStore } from '../piniaStores'
import { ImageDimension } from '../../constants'
import { useClientService } from '../clientService'
import { storeToRefs } from 'pinia'

type LoadPreviewOptions = {
  id: string
}

export const useLoadAvatar = () => {
  const clientService = useClientService()
  const avatarsStore = useAvatarsStore()
  const { avatarMap } = storeToRefs(avatarsStore)

  const loadAvatar = async (options: LoadPreviewOptions) => {
    console.log('Loading avatar for user:', options.id)
    if (unref(avatarMap).hasOwnProperty(options.id)) {
      return false
    }
    try {
      const avatar = await clientService.graphAuthenticated.photos.getUserPhoto(options.id, {
        responseType: 'blob'
      })
      avatarsStore.addAvatar(options.id, URL.createObjectURL(avatar))
    } catch (error) {
      avatarsStore.addAvatar(options.id, null)
    }
  }

  return { loadAvatar }
}
