<template>
  <app-template
    ref="template"
    :loading="loadResourcesTask.isRunning || !loadResourcesTask.last"
    :breadcrumbs="breadcrumbs"
    :side-bar-available-panels="sideBarAvailablePanels"
    :side-bar-panel-context="sideBarPanelContext"
    :show-batch-actions="!!selectedSpaces.length"
    :batch-actions="batchActions"
    :batch-action-items="selectedSpaces"
    :show-view-options="true"
  >
    <template #sideBarHeader>
      <div v-if="selectedSpaces.length === 1" class="flex items-center min-w-0 pl-2">
        <oc-icon name="layout-grid" size="small" class="mr-2 shrink-0" />
        <h2
          class="m-0 text-base font-semibold min-w-0 flex-1 truncate"
          v-text="selectedSpaces[0].name"
        />
      </div>
    </template>

    <template #mainContent>
      <app-loading-spinner v-if="isLoading" />
      <template v-else>
        <no-content-message
          v-if="!spaces.length"
          id="admin-settings-spaces-empty"
          img-src="/images/empty-states/empty-spaces.svg"
        >
          <template #message>
            <span v-text="$gettext('No spaces found')" />
          </template>
          <template #callToAction>
            <span v-text="$gettext('Create a new space and it will show up here')" />
          </template>
        </no-content-message>
        <template v-else>
          <spaces-list :class="{ 'settings-spaces-table-squashed': isSideBarOpen }">
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
import ActionsPanel from '../components/Spaces/SideBar/ActionsPanel.vue'
import {
  NoContentMessage,
  SideBarPanel,
  SideBarPanelContext,
  SpaceAction,
  SpaceDetails,
  SpaceDetailsMultiple,
  SpaceNoSelection,
  eventBus,
  queryItemAsString,
  useClientService,
  useExtensionRegistry,
  useRouteQuery,
  useSideBar,
  AppLoadingSpinner,
  ActionExtension
} from '@opencloud-eu/web-pkg'
import { call, SpaceResource } from '@opencloud-eu/web-client'
import {
  ComponentPublicInstance,
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  unref,
  useTemplateRef
} from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { useSpaceSettingsStore } from '../composables'
import { storeToRefs } from 'pinia'
import { Quota } from '@opencloud-eu/web-client/graph/generated'
import { spacesBatchActionsExtensionPoint } from '../extensionPoints'

const clientService = useClientService()
const { $gettext } = useGettext()
const sidebarStore = useSideBar()
const { isSideBarOpen } = storeToRefs(sidebarStore)
const { requestExtensions } = useExtensionRegistry()

let loadResourcesEventToken: string
let updateQuotaForSpaceEventToken: string
const template = useTemplateRef<ComponentPublicInstance<typeof AppTemplate>>('template')
const spaceSettingsStore = useSpaceSettingsStore()
const { spaces, selectedSpaces } = storeToRefs(spaceSettingsStore)

const currentPageQuery = useRouteQuery('page', '1')
const currentPage = computed(() => {
  return parseInt(queryItemAsString(unref(currentPageQuery)))
})

const itemsPerPageQuery = useRouteQuery('items-per-page', '1')
const itemsPerPage = computed(() => {
  return parseInt(queryItemAsString(unref(itemsPerPageQuery)))
})

const loadResourcesTask = useTask(function* (signal) {
  const drives = yield* call(
    clientService.graphAuthenticated.drives.listAllDrives(
      {
        orderBy: 'name asc',
        filter: 'driveType eq project',
        expand: 'root($expand=permissions)'
      },
      { signal }
    )
  )
  spaceSettingsStore.setSpaces(drives)
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

const extensionBatchActions = computed(() => {
  return (requestExtensions<ActionExtension>(spacesBatchActionsExtensionPoint) || []).map(
    (e) => e.action
  )
})

const batchActions = computed((): SpaceAction[] => {
  return [...unref(extensionBatchActions)]
    .filter((item) => item.category === 'tertiary')
    .filter((item) => item.isVisible({ resources: unref(selectedSpaces) }))
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
    name: 'SpaceActions',
    icon: 'play-circle',
    iconFillType: 'line',
    title: () => $gettext('Actions'),
    component: ActionsPanel,
    isVisible: ({ items }) => items.length === 1
  },
  {
    name: 'SpaceMembers',
    icon: 'group',
    title: () => $gettext('Members'),
    component: MembersPanel,
    isVisible: ({ items }) => items.length === 1
  }
] satisfies SideBarPanel<unknown, unknown, SpaceResource>[]

onMounted(async () => {
  await loadResourcesTask.perform()

  loadResourcesEventToken = eventBus.subscribe('app.admin-settings.list.load', async () => {
    await loadResourcesTask.perform()
    selectedSpaces.value = []

    const pageCount = Math.ceil(unref(spaces).length / unref(itemsPerPage))
    if (unref(currentPage) > 1 && unref(currentPage) > pageCount) {
      // reset pagination to avoid empty lists (happens when deleting all items on the last page)
      currentPageQuery.value = pageCount.toString()
    }
  })

  updateQuotaForSpaceEventToken = eventBus.subscribe(
    'app.admin-settings.spaces.space.quota.updated',
    ({ spaceId, quota }: { spaceId: string; quota: Quota }) => {
      const space = unref(spaces).find((s) => s.id === spaceId)
      if (space) {
        space.spaceQuota = quota
      }
    }
  )
})

onBeforeUnmount(() => {
  spaceSettingsStore.reset()
  eventBus.unsubscribe('app.admin-settings.list.load', loadResourcesEventToken)
  eventBus.unsubscribe(
    'app.admin-settings.spaces.space.quota.updated',
    updateQuotaForSpaceEventToken
  )
})

provide(
  'resource',
  computed(() => unref(selectedSpaces)[0])
)
</script>
