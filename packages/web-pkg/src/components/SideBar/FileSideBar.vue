<template>
  <InnerSideBar
    v-if="isOpen"
    ref="sidebar"
    class="files-side-bar z-30"
    :available-panels="availablePanels"
    :panel-context="panelContext"
    :loading="resourceLoading"
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
  isOutgoingShareResource,
  isShareSpaceResource,
  call
} from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import { useTask } from 'vue-concurrency'
import { getSharedDriveItem, setCurrentUserShareSpacePermissions } from '../../helpers'

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

const resourceLoading = ref(false)

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

/**
 * Loads graph permissions for project and share spaces if not yet loaded.
 * In most cases, they should be already loaded at this point, but there are
 * edge cases where they might not be, e.g. search result page or favorites.
 */
const loadGraphPermissionsTask = useTask(function* (signal) {
  if (isShareSpaceResource(space)) {
    const sharedDriveItem = yield* call(
      getSharedDriveItem({
        graphClient: clientService.graphAuthenticated,
        spacesStore,
        space,
        signal
      })
    )
    if (sharedDriveItem) {
      setCurrentUserShareSpacePermissions({
        sharesStore,
        spacesStore,
        space,
        sharedDriveItem
      })
    }
  }

  if (isProjectSpaceResource(unref(space))) {
    yield spacesStore.loadGraphPermissions({
      ids: [unref(space).id],
      graphClient: clientService.graphAuthenticated
    })
  }
})

const loadVersionsTask = useTask(function* (signal, resource: Resource) {
  versions.value = yield clientService.webdav.listFileVersions(resource.id, { signal })
})

const currentResourceMtime = ref<string>() // used to check if we need to load new versions
const loadedVersionsResourceId = ref<string>()
const loadedSharesResourceId = ref<string>()

function loadVersions(resource: Resource) {
  if (
    resource.id === unref(loadedVersionsResourceId) &&
    resource.mdate === unref(currentResourceMtime)
  ) {
    // don't load versions if the content of the resource didn't change
    return
  }

  loadedVersionsResourceId.value = resource.id
  currentResourceMtime.value = resource.mdate

  if (!canListVersions({ space, resource })) {
    return
  }

  if (loadVersionsTask.isRunning) {
    loadVersionsTask.cancelAll()
  }

  try {
    loadVersionsTask.perform(resource)
  } catch (e) {
    console.error(e)
  }
}

function loadShares(resource: Resource) {
  if (resource.id === unref(loadedSharesResourceId)) {
    // don't load shares if already loaded
    return
  }

  loadedSharesResourceId.value = resource.id

  if (!canListShares({ space, resource })) {
    return
  }

  if (loadSharesTask.isRunning) {
    loadSharesTask.cancelAll()
  }

  try {
    loadSharesTask.perform({ space, resource })
  } catch (e) {
    console.error(e)
  }
}

/**
 * Sets the loaded resource that gets injected into the sidebar panels.
 */
async function setLoadedResource(resource: Resource) {
  if (unref(loadedResource)?.id === resource.id) {
    // resource has already been loaded, no need to load it again. this can happen
    // when e.g. adding/removing shares for a resource
    return
  }

  if (!isOutgoingShareResource(resource) && !isIncomingShareResource(resource)) {
    loadedResource.value = resource
    return
  }

  // shared resources look different, hence we need to fetch the actual resource here
  try {
    const webDavResource = await clientService.webdav.getFileInfo(space, {
      path: resource.path
    })

    // make sure props from the share (= resource) are available on the merged resource
    loadedResource.value = {
      ...webDavResource,
      ...resource,
      tags: webDavResource.tags // tags are always [] in Graph API, hence take them from webdav
    }
  } catch (error) {
    loadedResource.value = resource
    console.error(error)
  }
}

function resetSidebarResource() {
  currentResourceMtime.value = undefined
  loadedSharesResourceId.value = undefined
  loadedVersionsResourceId.value = undefined
  versions.value = []
  sharesStore.pruneShares()
  loadedResource.value = null
}

// watch key on the selection identity (id) and content version (mdate).
// deep-watching the full resource objects would re-fire the watcher whenever a loader
// mutates them (e.g. lazy-loaded space `graphPermissions`), causing redundant runs.
const panelItemKeys = computed(() =>
  unref(panelContext)
    .items.map((item) => `${item.id}:${item.mdate}`)
    .join(',')
)

watch(
  () => [unref(panelItemKeys), unref(isOpen)],
  async () => {
    if (!unref(isOpen) || !unref(panelContext).items?.length) {
      resetSidebarResource()
      return
    }

    if (unref(panelContext).items.length !== 1) {
      // don't load additional metadata for multi-select contexts
      return
    }

    const resource = unref(panelContext).items[0]

    // only show the loading state (which unmounts/remounts the panels) when the
    // selected resource actually changed. for same-resource events like adding or
    // removing a share, all loaders below early-return, so a loading toggle would
    // needlessly remount the panel content.
    const resourceChanged = unref(loadedResource)?.id !== resource.id
    if (resourceChanged) {
      resourceLoading.value = true
    }

    if (loadGraphPermissionsTask.isRunning) {
      loadGraphPermissionsTask.cancelAll()
    }

    try {
      if (
        !space.graphPermissions &&
        (isShareSpaceResource(space) || isProjectSpaceResource(space))
      ) {
        await loadGraphPermissionsTask.perform()
      }
    } catch (e) {
      console.error(e)
    }

    loadVersions(resource)
    loadShares(resource)

    try {
      await setLoadedResource(resource)
    } finally {
      resourceLoading.value = false
    }
  },
  { immediate: true }
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
