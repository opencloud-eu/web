<template>
  <app-template
    :loading="isLoading"
    :breadcrumbs="breadcrumbs"
    :side-bar-available-panels="sideBarAvailablePanels"
    :side-bar-panel-context="sideBarPanelContext"
    :show-batch-actions="!!selectedSpaces.length"
    :batch-actions="batchActions"
    :batch-action-items="selectedSpaces"
    :show-view-options="true"
    @clear-selection="spaceSettingsStore.setSelectedSpaces([])"
  >
    <template #sideBarHeader>
      <div v-if="selectedSpaces.length === 1" class="flex items-center min-w-0 pl-2">
        <oc-icon name="layout-grid" size-class="size-4" class="mr-2 shrink-0" />
        <h2
          class="m-0 text-base font-semibold min-w-0 flex-1 truncate"
          v-text="selectedSpaces[0].name"
        />
      </div>
    </template>
    <template #actions>
      <div class="flex justify-end w-full my-2 items-center">
        <oc-search-bar
          v-model="filterTerm"
          class="w-full sm:w-3xs"
          :label="$gettext('Search')"
          :placeholder="$gettext('Search for spaces')"
          button-hidden
          :is-rounded="false"
        />
      </div>
    </template>

    <template #mainContent>
      <app-loading-spinner v-if="isLoading" />
      <template v-else>
        <no-content-message
          v-if="!spaces.length"
          id="admin-settings-spaces-empty"
          img-src="images/illustrations/spaces.svg"
        >
          <template #message>
            <span v-text="$gettext('No spaces found')" />
          </template>
          <template #callToAction>
            <span v-text="$gettext('Create a new space and it will show up here')" />
          </template>
        </no-content-message>
        <template v-else>
          <spaces-list
            :filter-term="filterTerm"
            :class="{ 'settings-spaces-table-squashed': isSideBarOpen }"
          >
            <template #contextMenu>
              <context-actions :items="selectedSpaces" />
            </template>
          </spaces-list>
        </template>
      </template>
    </template>
  </app-template>
</template>

<script setup lang="ts">
import AppTemplate from '../components/AppTemplate.vue'
import SpacesList from '../components/Spaces/SpacesList.vue'
import ContextActions from '../components/Spaces/ContextActions.vue'
import MembersPanel from '../components/Spaces/SideBar/MembersPanel.vue'
import {
  NoContentMessage,
  SideBarPanel,
  SideBarPanelContext,
  SpaceAction,
  SpaceDetails,
  SpaceDetailsMultiple,
  SpaceNoSelection,
  queryItemAsString,
  useClientService,
  useFileActions,
  useRouteQuery,
  useSideBar,
  useSpacesStore,
  AppLoadingSpinner
} from '@opencloud-eu/web-pkg'
import { call, SpaceResource } from '@opencloud-eu/web-client'
import { computed, onBeforeUnmount, onMounted, provide, ref, unref, watch } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { useSpaceSettingsStore } from '../composables'
import { storeToRefs } from 'pinia'
import { spacesBatchActionsExtensionPoint } from '../extensionPoints'

const clientService = useClientService()
const { $gettext } = useGettext()
const sidebarStore = useSideBar()
const { isSideBarOpen } = storeToRefs(sidebarStore)
const spacesStore = useSpacesStore()
const { getExtensionActions } = useFileActions()

const spaceSettingsStore = useSpaceSettingsStore()
const { selectedSpaces } = storeToRefs(spaceSettingsStore)
const { allProjectSpaces } = storeToRefs(spacesStore)
const spaces = computed(() => unref(allProjectSpaces) || [])

const filterTerm = ref('')

const currentPageQuery = useRouteQuery('page', '1')
const currentPage = computed(() => {
  return parseInt(queryItemAsString(unref(currentPageQuery)))
})

const itemsPerPageQuery = useRouteQuery('items-per-page', '1')
const itemsPerPage = computed(() => {
  return parseInt(queryItemAsString(unref(itemsPerPageQuery)))
})

// the members of a space (incl. its managers) are only part of the response with this expansion
const spacePermissionsExpand = 'root($expand=permissions)'

const loadResourcesTask = useTask(function* (signal) {
  const drives = yield* call(
    clientService.graphAuthenticated.drives.listAllDrives(
      {
        orderBy: 'name asc',
        filter: 'driveType eq project',
        expand: spacePermissionsExpand
      },
      { signal }
    )
  )
  spacesStore.setAllProjectSpaces(drives)
})

const isLoading = computed(() => {
  return loadResourcesTask.isRunning || !loadResourcesTask.last
})

const breadcrumbs = computed(() => [
  {
    text: $gettext('Spaces'),
    onClick: () => {
      spaceSettingsStore.setSelectedSpaces([])
      loadResourcesTask.perform()
    }
  }
])

const extensionBatchActions = computed(() =>
  getExtensionActions<SpaceResource>(spacesBatchActionsExtensionPoint.id)
)

const batchActions = computed((): SpaceAction[] => {
  return unref(extensionBatchActions).filter(
    (item) =>
      item.category === 'tertiary' &&
      item.isVisible({ resources: unref(selectedSpaces), space: undefined })
  )
})

const sideBarPanelContext = computed<SideBarPanelContext<unknown, unknown, SpaceResource>>(() => {
  return {
    parent: null,
    items: unref(selectedSpaces)
  }
})
const sideBarAvailablePanels = [
  {
    name: 'SpaceNoSelection',
    icon: 'layout-grid',
    title: () => $gettext('Details'),
    component: SpaceNoSelection,
    componentAttrs: () => ({ spacesCount: unref(spaces).length }),
    isRoot: () => true,
    isVisible: ({ items }) => items.length === 0
  },
  {
    name: 'SpaceDetails',
    icon: 'layout-grid',
    title: () => $gettext('Details'),
    component: SpaceDetails,
    componentAttrs: () => ({
      showShareIndicators: false
    }),
    isRoot: () => true,
    isVisible: ({ items }) => items.length === 1
  },
  {
    name: 'SpaceDetailsMultiple',
    icon: 'layout-grid',
    title: () => $gettext('Details'),
    component: SpaceDetailsMultiple,
    componentAttrs: ({ items }) => ({
      selectedSpaces: items
    }),
    isRoot: () => true,
    isVisible: ({ items }) => items.length > 1
  },
  {
    name: 'SpaceMembers',
    icon: 'group',
    title: () => $gettext('Members'),
    component: MembersPanel,
    isVisible: ({ items }) => items.length === 1
  }
] satisfies SideBarPanel<unknown, unknown, SpaceResource>[]

/**
 * Spaces coming from other requests than the list (e.g. created via the FAB or updated by an
 * action) don't contain their members, so they are loaded again with them. A space that changes
 * while it is being loaded is loaded once more afterwards, the first result might be outdated.
 */
const spacesLoadingPermissions = new Set<string>()
const spacesToReloadPermissions = new Set<string>()
async function loadSpaceWithPermissions(spaceId: string): Promise<void> {
  if (spacesLoadingPermissions.has(spaceId)) {
    spacesToReloadPermissions.add(spaceId)
    return
  }
  spacesLoadingPermissions.add(spaceId)
  try {
    const [space] = await clientService.graphAuthenticated.drives.listAllDrives({
      filter: `id eq '${spaceId}'`,
      expand: spacePermissionsExpand
    })
    if (space) {
      // no members at all shouldn't lead to loading the space over and over again
      spacesStore.upsertSpace({
        ...space,
        root: { ...space.root, permissions: space.root?.permissions ?? [] }
      })
    }
  } catch (error) {
    console.error(error)
  } finally {
    spacesLoadingPermissions.delete(spaceId)
    if (spacesToReloadPermissions.delete(spaceId)) {
      loadSpaceWithPermissions(spaceId)
    }
  }
}

// every update of a space assigns a new `root`, so a new root without members means new data
// without members. comparing the roots also avoids reloading the same data over and over again
watch(
  () =>
    unref(spaces)
      .filter((space) => !space.root?.permissions)
      .map(({ id, root }) => ({ id, root })),
  (spacesWithoutMembers, previousSpacesWithoutMembers = []) => {
    spacesWithoutMembers
      .filter(
        ({ id, root }) =>
          !previousSpacesWithoutMembers.some(
            (previous) => previous.id === id && previous.root === root
          )
      )
      .forEach(({ id }) => loadSpaceWithPermissions(id))
  }
)

// actions like setting the image of a space check the permissions of the user in that space
watch(
  () => unref(selectedSpaces).map(({ id }) => id),
  async (ids) => {
    try {
      await spacesStore.loadGraphPermissions({ ids, graphClient: clientService.graphAuthenticated })
    } catch (error) {
      console.error(error)
    }
  }
)

// e.g. after deleting spaces: drop them from the selection and avoid an empty last page
watch(
  () => unref(spaces).length,
  () => {
    const spaceIds = unref(spaces).map(({ id }) => id)
    const selection = unref(selectedSpaces).filter(({ id }) => spaceIds.includes(id))
    if (selection.length !== unref(selectedSpaces).length) {
      spaceSettingsStore.setSelectedSpaces(selection)
    }

    const pageCount = Math.max(1, Math.ceil(spaceIds.length / unref(itemsPerPage)))
    if (unref(currentPage) > pageCount) {
      currentPageQuery.value = pageCount.toString()
    }
  }
)

onMounted(async () => {
  await loadResourcesTask.perform()
})

onBeforeUnmount(() => {
  spaceSettingsStore.reset()
  spacesStore.setAllProjectSpaces(undefined)
})

provide(
  'resource',
  computed(() => unref(selectedSpaces)[0])
)
</script>
