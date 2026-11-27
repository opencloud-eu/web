import {
  useMessages,
  useResourcesStore,
  useRoute,
  useSpacesStore,
  useUserStore,
  useClientService,
  useConfigStore,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg'
import { computed, onMounted, onBeforeUnmount, unref, watch, Ref } from 'vue'
import {
  Resource,
  SpaceResource,
  isPublicSpaceResource,
  isShareSpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import {
  useService,
  useUpload,
  UppyService,
  UploadResult,
  OcUppyFile,
  OcUppyMeta
} from '@opencloud-eu/web-pkg'
import { HandleUpload } from '../HandleUpload'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import PQueue from 'p-queue'

// above this, listing the whole folder is cheaper than loading each item
const TARGETED_REFRESH_MAX_ITEMS = 20

export const useFileUpload = (space: Ref<SpaceResource>) => {
  const uppyService = useService<UppyService>('$uppyService')
  const clientService = useClientService()
  const userStore = useUserStore()
  const spacesStore = useSpacesStore()
  const messageStore = useMessages()
  const route = useRoute()
  const language = useGettext()
  const extensionRegistry = useExtensionRegistry()
  const configStore = useConfigStore()

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
  let uploadCancelledSub: string
  let uploadSuccessSub: string

  // folders are created outside of uppy, so e.g. empty ones are missing in the upload result
  let createdTopLevelFolders: OcUppyFile[] = []

  const canUpload = computed(() => {
    return unref(currentFolder)?.canUpload({ user: userStore.user })
  })

  function onUploadSuccess(file: OcUppyFile) {
    if (file.meta.isFolder && !file.meta.relativeFolder) {
      createdTopLevelFolders.push(file)
    }
  }

  function onUploadCompleted(result: UploadResult) {
    return refreshAfterUpload(result, { listFolder: false })
  }

  function onUploadCancelled(result: UploadResult) {
    // folders of not yet uploaded files may have been created already
    return refreshAfterUpload(result, { listFolder: true })
  }

  async function refreshAfterUpload(
    { successful = [], failed = [] }: UploadResult,
    { listFolder }: { listFolder: boolean }
  ) {
    // folders of failed files may have been created already, so failed uploads need a refresh too
    const files = [...successful, ...failed, ...createdTopLevelFolders]
    createdTopLevelFolders = []
    if (!files.length) {
      return
    }

    try {
      await refreshQuota(files[0].meta)
      await refreshResources(files, listFolder)
    } catch (e) {
      // the refresh fails if e.g. the upload target folder has been deleted in the meantime
      console.error(e)
    }
  }

  async function refreshQuota({ spaceId, driveType }: OcUppyMeta) {
    if (isPublicSpaceResource(unref(space))) {
      return
    }

    const isOwnSpace = spacesStore.spaces.find(({ id }) => id === spaceId)?.isOwner(userStore.user)
    if (driveType !== 'project' && !isOwnSpace) {
      return
    }

    const client = clientService.graphAuthenticated
    const updatedSpace = await client.drives.getDrive(spaceId)
    spacesStore.updateSpaceField({
      id: updatedSpace.id,
      field: 'spaceQuota',
      value: updatedSpace.spaceQuota
    })
  }

  async function refreshResources(files: OcUppyFile[], listFolder: boolean) {
    const folder = unref(currentFolder)
    if (!folder || files[0].meta.spaceId !== unref(space).id) {
      return
    }

    const topLevelNames = listFolder ? undefined : getTopLevelNames(files, folder)
    let resources: Resource[]
    // loading each item only pays off if the folder holds many more items than were uploaded
    if (
      !topLevelNames ||
      topLevelNames.length > TARGETED_REFRESH_MAX_ITEMS ||
      topLevelNames.length >= resourcesStore.resources.length
    ) {
      resources = (await clientService.webdav.listFiles(unref(space), { path: folder.path }))
        .children
    } else {
      resources = await loadResources(topLevelNames, folder)
    }

    if (isShareSpaceResource(unref(space))) {
      // TODO: remove when server returns share id for federated shares in propfind response
      resources.forEach((r) => (r.remoteItemId = unref(space).id))
    }

    const existingEtags = new Map(resourcesStore.resources.map((r) => [r.id, r.etag]))
    const changedResources = resources.filter((r) => existingEtags.get(r.id) !== r.etag)
    if (changedResources.length) {
      resourcesStore.upsertResources(changedResources)
    }
  }

  /**
   * Names of the uploaded items directly inside the current folder, or undefined if they
   * can't be determined and the whole folder needs to be listed.
   */
  function getTopLevelNames(files: OcUppyFile[], folder: Resource): string[] | undefined {
    // vault uploads only carry the encrypted file names
    if (folder.isInVault) {
      return undefined
    }

    const names = new Set<string>()
    for (const { name, meta } of files) {
      // the user may have navigated away or uploaded into a sub folder
      if (meta.currentFolder !== folder.path) {
        return undefined
      }
      names.add(meta.relativeFolder ? meta.relativeFolder.split('/').filter(Boolean)[0] : name)
    }
    return [...names]
  }

  async function loadResources(names: string[], folder: Resource): Promise<Resource[]> {
    const queue = new PQueue({
      concurrency: configStore.options.concurrentRequests.resourceBatchActions
    })
    const results = await Promise.allSettled(
      names.map((name) =>
        queue.add(() =>
          clientService.webdav.getFileInfo(unref(space), { path: urlJoin(folder.path, name) })
        )
      )
    )
    // failed uploads may not exist on the server
    return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  }

  onMounted(() => {
    uploadCompletedSub = uppyService.subscribe('uploadCompleted', onUploadCompleted)
    uploadCancelledSub = uppyService.subscribe('uploadCancelled', onUploadCancelled)
    uploadSuccessSub = uppyService.subscribe('uploadSuccess', onUploadSuccess)
  })

  onBeforeUnmount(() => {
    uppyService.removePlugin(uppyService.getPlugin('HandleUpload'))
    uppyService.unsubscribe('uploadCompleted', uploadCompletedSub)
    uppyService.unsubscribe('uploadCancelled', uploadCancelledSub)
    uppyService.unsubscribe('uploadSuccess', uploadSuccessSub)
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
