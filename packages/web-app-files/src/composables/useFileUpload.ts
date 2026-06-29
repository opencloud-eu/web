import {
  useMessages,
  useResourcesStore,
  useRoute,
  useSpacesStore,
  useUserStore,
  useClientService,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg'
import { computed, onMounted, onBeforeUnmount, unref, watch, Ref } from 'vue'
import { SpaceResource, isPublicSpaceResource } from '@opencloud-eu/web-client'
import { useService, useUpload, UppyService, UploadResult } from '@opencloud-eu/web-pkg'
import { HandleUpload } from '../HandleUpload'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

export const useFileUpload = (space: Ref<SpaceResource>) => {
  const uppyService = useService<UppyService>('$uppyService')
  const clientService = useClientService()
  const userStore = useUserStore()
  const spacesStore = useSpacesStore()
  const messageStore = useMessages()
  const route = useRoute()
  const language = useGettext()
  const extensionRegistry = useExtensionRegistry()

  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)

  useUpload({ uppyService })

  if (!uppyService.getPlugin('HandleUpload')) {
    uppyService.addPlugin(HandleUpload, {
      clientService,
      language,
      route,
      space,
      userStore,
      spacesStore,
      messageStore,
      resourcesStore,
      uppyService,
      extensionRegistry
    })
  }

  let uploadCompletedSub: string

  const canUpload = computed(() => {
    return unref(currentFolder)?.canUpload({ user: userStore.user })
  })

  const onUploadComplete = async (result: UploadResult) => {
    const file = result.successful?.[0]
    if (!file) {
      return
    }

    const { spaceId, driveType } = file.meta
    if (!isPublicSpaceResource(unref(space))) {
      const isOwnSpace = spacesStore.spaces
        .find(({ id }) => id === spaceId)
        ?.isOwner(userStore.user)

      if (driveType === 'project' || isOwnSpace) {
        const client = clientService.graphAuthenticated
        const updatedSpace = await client.drives.getDrive(spaceId)
        spacesStore.updateSpaceField({
          id: updatedSpace.id,
          field: 'spaceQuota',
          value: updatedSpace.spaceQuota
        })
      }
    }

    if (!unref(currentFolder) || spaceId !== unref(space).id) {
      return
    }

    const { children } = await clientService.webdav.listFiles(unref(space), {
      path: unref(currentFolder).path
    })

    const existingIds = new Set(resourcesStore.resources.map((r) => r.id))
    const newResources = children.filter((child) => !existingIds.has(child.id))
    resourcesStore.upsertResources(newResources)
  }

  onMounted(() => {
    uploadCompletedSub = uppyService.subscribe('uploadCompleted', onUploadComplete)
  })

  onBeforeUnmount(() => {
    uppyService.removePlugin(uppyService.getPlugin('HandleUpload'))
    uppyService.unsubscribe('uploadCompleted', uploadCompletedSub)
    uppyService.removeDropTarget()
  })

  watch(
    canUpload,
    () => {
      const targetSelector = '#files-view'
      const target = document.querySelector(targetSelector)

      if (target && unref(canUpload)) {
        uppyService.useDropTarget({ targetSelector })
      } else {
        uppyService.removeDropTarget()
      }
    },
    { immediate: true }
  )
}
