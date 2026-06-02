<template>
  <InnerSideBar
    v-if="isOpen"
    ref="sidebar"
    class="files-side-bar z-30"
    :available-panels="availablePanels"
    :panel-context="panelContext"
    :loading="isLoading"
    v-bind="$attrs"
    data-custom-key-bindings-disabled="true"
  >
    <template #rootHeader>
      <file-info v-if="isFileHeaderVisible" :is-sub-panel-active="false" />
      <space-info v-else-if="isSpaceHeaderVisible" />
    </template>
    <template #subHeader>
      <file-info v-if="isFileHeaderVisible" :is-sub-panel-active="true" />
      <space-info v-else-if="isSpaceHeaderVisible" />
    </template>
  </InnerSideBar>
</template>

<script setup lang="ts">
import { computed, provide, readonly, ref, unref, watch } from 'vue'
import { SideBarPanelContext } from '../SideBar/types'
import InnerSideBar from '../SideBar/SideBar.vue'
import SpaceInfo from './Spaces/SpaceInfo.vue'
import FileInfo from './Files/FileInfo.vue'
import {
  SidebarPanelExtension,
  useClientService,
  useExtensionRegistry,
  useSelectedResources,
  useSpacesStore,
  useSharesStore,
  useResourcesStore,
  useCanListShares,
  useCanListVersions,
  useSideBar,
  useLoadShares
} from '../../composables'
import {
  isProjectSpaceResource,
  SpaceResource,
  Resource,
  isIncomingShareResource,
  isOutgoingShareResource
} from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import { useTask } from 'vue-concurrency'

const { space = undefined } = defineProps<{
  space?: SpaceResource
}>()

const clientService = useClientService()
const extensionRegistry = useExtensionRegistry()
const spacesStore = useSpacesStore()
const sharesStore = useSharesStore()
const { canListShares } = useCanListShares()
const { canListVersions } = useCanListVersions()

const resourcesStore = useResourcesStore()
const { currentFolder } = storeToRefs(resourcesStore)

const sidebarStore = useSideBar()
const { isSideBarOpen: isOpen } = storeToRefs(sidebarStore)

const { loadSharesTask, availableExternalShareRoles, availableInternalShareRoles } = useLoadShares()

const loadedResource = ref<Resource>()
const versions = ref<Resource[]>([])

const { selectedResources } = useSelectedResources()

const sharesLoading = ref(false)

const isLoading = computed(() => {
  return unref(sharesLoading)
})

const panelContext = computed<SideBarPanelContext<SpaceResource, Resource, Resource>>(() => {
  if (unref(selectedResources).length === 0) {
    return {
      root: space,
      parent: null,
      items: unref(currentFolder)?.id ? [unref(currentFolder)] : []
    }
  }
  return {
    root: space,
    parent: unref(currentFolder),
    items: unref(selectedResources)
  }
})

const isFileHeaderVisible = computed(() => {
  return (
    unref(panelContext).items?.length === 1 && !isProjectSpaceResource(unref(panelContext).items[0])
  )
})
const isSpaceHeaderVisible = computed(() => {
  return (
    unref(panelContext).items?.length === 1 && isProjectSpaceResource(unref(panelContext).items[0])
  )
})

const availablePanels = computed(() =>
  extensionRegistry
    .requestExtensions<SidebarPanelExtension<SpaceResource, Resource, Resource>>({
      id: 'global.files.sidebar',
      extensionType: 'sidebarPanel'
    })
    .map((e) => e.panel)
)

const loadVersionsTask = useTask(function* (signal, resource: Resource) {
  versions.value = yield clientService.webdav.listFileVersions(resource.id, { signal })
})

const currentResourceMtime = ref<string>() // used to check if we need to load new versions
watch(
  () => [...unref(panelContext).items, isOpen],
  async (newValue, oldValue) => {
    if (unref(panelContext).items?.length !== 1) {
      return
    }

    if (!unref(isOpen)) {
      currentResourceMtime.value = undefined
      versions.value = []
      return
    }

    const res1 = newValue?.[0] as Resource
    const res2 = oldValue?.[0] as Resource
    if (res1?.id === res2?.id && res1?.mdate === unref(currentResourceMtime)) {
      // don't load versions if the content of the resource didn't change
      return
    }

    const resource = unref(panelContext).items[0]
    currentResourceMtime.value = resource.mdate

    if (loadVersionsTask.isRunning) {
      loadVersionsTask.cancelAll()
    }

    if (!canListVersions({ space, resource })) {
      return
    }

    try {
      await loadVersionsTask.perform(resource)
    } catch (e) {
      console.error(e)
    }
  },
  { immediate: true, deep: true }
)

const panelItemIds = computed(() => unref(panelContext).items.map((item) => item.id))

watch(
  () => [panelItemIds, isOpen],
  async () => {
    if (!unref(isOpen) || !unref(panelContext).items?.length) {
      sharesStore.pruneShares()
      loadedResource.value = null
      return
    }
    if (unref(panelContext).items?.length !== 1) {
      // don't load additional metadata for empty or multi-select contexts
      return
    }

    const resource = unref(panelContext).items[0]
    sharesLoading.value = true

    if (isProjectSpaceResource(resource)) {
      await spacesStore.loadGraphPermissions({
        ids: [resource.id],
        graphClient: clientService.graphAuthenticated
      })
    }

    if (canListShares({ space, resource })) {
      try {
        if (loadSharesTask.isRunning) {
          loadSharesTask.cancelAll()
        }

        loadSharesTask.perform({ space, resource })
      } catch (e) {
        console.error(e)
      }
    }

    if (!isOutgoingShareResource(resource) && !isIncomingShareResource(resource)) {
      loadedResource.value = resource
      sharesLoading.value = false
      return
    }

    // shared resources look different, hence we need to fetch the actual resource here
    try {
      const webDavResource = await clientService.webdav.getFileInfo(space, {
        path: resource.path
      })

      // make sure props from the share (=resource) are available on the merged resource
      const mergedResource = {
        ...webDavResource,
        ...resource,
        tags: webDavResource.tags // tags are always [] in Graph API, hence take them from webdav
      }
      loadedResource.value = mergedResource
    } catch (error) {
      loadedResource.value = resource
      console.error(error)
    }
    sharesLoading.value = false
  },
  {
    deep: true,
    immediate: true
  }
)

provide('resource', readonly(loadedResource))
provide('versions', readonly(versions))
provide(
  'space',
  computed(() => space)
)
provide('availableInternalShareRoles', readonly(availableInternalShareRoles))
provide('availableExternalShareRoles', readonly(availableExternalShareRoles))
provide(
  'versionsLoading',
  computed(() => loadVersionsTask.isRunning)
)
</script>
