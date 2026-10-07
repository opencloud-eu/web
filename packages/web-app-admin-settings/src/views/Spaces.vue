<template>
  <app-template
    :loading="isLoading"
    :breadcrumbs="breadcrumbs"
    :side-bar-available-panels="sideBarAvailablePanels"
    :side-bar-panel-context="sideBarPanelContext"
    :show-batch-actions="!!selectedSpaces.length"
    :batch-actions="batchActions"
    :batch-actions-loading="batchActionsLoading"
    :batch-action-items="selectedSpaces"
    :show-view-options="true"
    @clear-selection="spaceSettingsStore.setSelectedSpaces([])"
  >
    <template #sideBarHeader>
      <space-info v-if="selectedSpaces.length === 1" :space-resource="selectedSpaces[0]" />
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
  SpaceInfo,
  SpaceNoSelection,
  useClientService,
  useFileActions,
  useSideBar,
  useSpacesStore,
  AppLoadingSpinner
} from '@opencloud-eu/web-pkg'
import { call, isProjectSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
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
  return unref(extensionBatchActions).filter((item) =>
    item.isVisible({ resources: unref(selectedSpaces), space: undefined })
  )
})

// the actions depend on the permissions of the user in the selected spaces
const batchActionsLoading = computed(() =>
  unref(selectedSpaces).some(({ graphPermissions }) => graphPermissions === undefined)
)

const sideBarPanelContext = computed<SideBarPanelContext<unknown, unknown, SpaceResource>>(() => {
  return {
    parent: null,
    items: unref(selectedSpaces)
  }
})
const sideBarAvailablePanels = [
  {
    name: 'no-selection',
    icon: 'questionnaire-line',
    title: () => $gettext('Details'),
    component: SpaceNoSelection,
    componentAttrs: () => ({ spacesCount: unref(spaces).length }),
    isRoot: () => true,
    isVisible: ({ items }) => items.length === 0
  },
  {
    name: 'details-space',
    icon: 'questionnaire-line',
    title: () => $gettext('Details'),
    component: SpaceDetails,
    componentAttrs: () => ({
      showShareIndicators: false
    }),
    isRoot: () => true,
    isVisible: ({ items }) => items.length === 1
  },
  {
    name: 'details-space-multiple',
    icon: 'questionnaire-line',
    title: () => $gettext('Details'),
    component: SpaceDetailsMultiple,
    componentAttrs: ({ items }) => ({
      selectedSpaces: items
    }),
    isRoot: () => true,
    isVisible: ({ items }) => items.length > 1
  },
  {
    name: 'space-share',
    icon: { name: 'group', fillType: 'line' },
    title: () => $gettext('Members'),
    component: MembersPanel,
    isVisible: ({ items }) => items.length === 1 && !items[0].disabled
  }
] satisfies SideBarPanel<unknown, unknown, SpaceResource>[]

// spaces from other requests than the list (e.g. created via the FAB or updated after member
// changes) come without their members, so the members are loaded again
const latestMembersRequests: Record<string, number> = {}
async function loadSpaceMembers(spaceId: string) {
  const request = (latestMembersRequests[spaceId] ?? 0) + 1
  latestMembersRequests[spaceId] = request
  try {
    const [space] = await clientService.graphAuthenticated.drives.listAllDrives({
      filter: `id eq '${spaceId}'`,
      expand: spacePermissionsExpand
    })
    // the response of an earlier request might be outdated
    if (space && latestMembersRequests[spaceId] === request) {
      spacesStore.updateSpaceField({ id: spaceId, field: 'root', value: space.root })
    }
  } catch (error) {
    console.error(error)
  }
}

spacesStore.$onAction(({ name, args, after }) => {
  if (name === 'upsertSpace') {
    after(() => {
      const [space] = args
      if (isProjectSpaceResource(space) && !space.root?.permissions) {
        loadSpaceMembers(space.id)
      }
    })
  }
  // the current user lost access to the space, which changes its members and permissions
  if (name === 'removeSpace' && args[1]?.deleted === false) {
    after(() => {
      const [space] = args
      loadSpaceMembers(space.id)
      spacesStore
        .loadGraphPermissions({
          ids: [space.id],
          graphClient: clientService.graphAuthenticated,
          useCache: false
        })
        .catch(console.error)
    })
  }
})

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

watch(
  () => unref(spaces).length,
  () => {
    const spaceIds = unref(spaces).map(({ id }) => id)
    const selection = unref(selectedSpaces).filter(({ id }) => spaceIds.includes(id))
    if (selection.length !== unref(selectedSpaces).length) {
      spaceSettingsStore.setSelectedSpaces(selection)
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
