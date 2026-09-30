<template>
  <app-template
    :loading="isLoading"
    :breadcrumbs="breadcrumbs"
    :side-bar-available-panels="sideBarAvailablePanels"
    :side-bar-panel-context="sideBarPanelContext"
    :show-batch-actions="!!selectedGroups.length"
    :batch-actions="batchActions"
    :batch-action-items="selectedGroups"
    :show-view-options="true"
    @clear-selection="groupSettingsStore.setSelectedGroups([])"
  >
    <template #sideBarHeader>
      <div v-if="selectedGroups.length === 1" class="flex items-center min-w-0">
        <oc-avatar
          class="mr-2 shrink-0"
          :width="24"
          :userid="selectedGroups[0].id"
          :user-name="selectedGroups[0].displayName"
          background-color="var(--oc-role-secondary)"
        />
        <h2
          class="m-0 text-base font-semibold min-w-0 flex-1 truncate"
          v-text="selectedGroups[0].displayName"
        />
      </div>
    </template>
    <template #actions>
      <div class="flex justify-end w-full my-2 items-center">
        <oc-search-bar
          v-model="filterTerm"
          class="w-full sm:w-3xs"
          :label="$gettext('Search')"
          :placeholder="$gettext('Search for groups')"
          button-hidden
          :is-rounded="false"
        />
      </div>
    </template>

    <template #mainContent>
      <app-loading-spinner v-if="isLoading" />
      <template v-else>
        <no-content-message
          v-if="!groups.length"
          id="admin-settings-groups-empty"
          img-src="images/illustrations/groups.svg"
        >
          <template #message>
            <span v-text="$gettext('No groups found')" />
          </template>
          <template #callToAction>
            <span v-text="$gettext('Create a new group and it will show up here')" />
          </template>
        </no-content-message>
        <template v-else>
          <groups-list :filter-term="filterTerm">
            <template #contextMenu>
              <context-actions :action-options="{ resources: selectedGroups }" />
            </template>
          </groups-list>
        </template>
      </template>
    </template>
  </app-template>
</template>

<script setup lang="ts">
import AppTemplate from '../components/AppTemplate.vue'
import ContextActions from '../components/Groups/ContextActions.vue'
import DetailsPanel from '../components/Groups/SideBar/DetailsPanel.vue'
import EditPanel from '../components/Groups/SideBar/EditPanel.vue'
import GroupsList from '../components/Groups/GroupsList.vue'
import MembersPanel from '../components/Groups/SideBar/MembersPanel.vue'
import { useGroupSettingsStore } from '../composables'
import { useGroupActionsDelete } from '../composables/actions/groups'
import {
  AppLoadingSpinner,
  NoContentMessage,
  SideBarPanel,
  SideBarPanelContext,
  useClientService
} from '@opencloud-eu/web-pkg'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { computed, ref, unref, onBeforeUnmount, onMounted, provide } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { call } from '@opencloud-eu/web-client'

const groupSettingsStore = useGroupSettingsStore()
const { selectedGroups, groups } = storeToRefs(groupSettingsStore)
const clientService = useClientService()
const { $gettext } = useGettext()
const filterTerm = ref('')

provide(
  'group',
  computed(() => unref(selectedGroups)[0])
)

const loadResourcesTask = useTask(function* (signal) {
  const loadedGroups = yield* call(
    clientService.graphAuthenticated.groups.listGroups({ orderBy: ['displayName'] }, { signal })
  )
  groupSettingsStore.setGroups(loadedGroups || [])
}).restartable()

const isLoading = computed(() => loadResourcesTask.isRunning || !loadResourcesTask.last)

const { actions: deleteActions } = useGroupActionsDelete()
const batchActions = computed(() =>
  unref(deleteActions).filter((item) => item.isVisible({ resources: unref(selectedGroups) }))
)

const breadcrumbs = computed(() => [
  {
    text: $gettext('Groups'),
    onClick: () => {
      groupSettingsStore.setSelectedGroups([])
      loadResourcesTask.perform()
    }
  }
])

const sideBarPanelContext = computed<SideBarPanelContext<unknown, unknown, Group>>(() => ({
  parent: null,
  items: unref(selectedGroups)
}))

const sideBarAvailablePanels = [
  {
    name: 'DetailsPanel',
    icon: 'group-2',
    title: () => $gettext('Details'),
    component: DetailsPanel,
    componentAttrs: () => ({
      groups: unref(selectedGroups),
      groupsCount: unref(groups).length
    }),
    isRoot: () => true,
    isVisible: () => true
  },
  {
    name: 'EditPanel',
    icon: 'pencil',
    title: () => $gettext('Edit group'),
    component: EditPanel,
    componentAttrs: ({ items }) => ({
      group: items.length === 1 ? items[0] : null
    }),
    isVisible: ({ items }) => items.length === 1 && !items[0].groupTypes?.includes('ReadOnly')
  },
  {
    name: 'GroupMembers',
    icon: 'group',
    title: () => $gettext('Members'),
    component: MembersPanel,
    isVisible: ({ items }) => items.length === 1
  }
] satisfies SideBarPanel<unknown, unknown, Group>[]

onMounted(async () => {
  await loadResourcesTask.perform()
})

onBeforeUnmount(() => {
  groupSettingsStore.reset()
})
</script>
