<template>
  <app-template
    :breadcrumbs="breadcrumbs"
    :side-bar-available-panels="sideBarAvailablePanels"
    :side-bar-panel-context="sideBarPanelContext"
    :side-bar-loading="sideBarLoading"
    :show-batch-actions="!!selectedUsers.length"
    :batch-actions="batchActions"
    :batch-action-items="selectedUsers"
    :show-view-options="true"
    @clear-selection="userSettingsStore.setSelectedUsers([])"
  >
    <template #sideBarHeader>
      <div v-if="selectedUsers.length === 1" class="flex items-center min-w-0">
        <oc-avatar
          class="me-2 shrink-0"
          :width="24"
          :userid="selectedUsers[0].id"
          :user-name="selectedUsers[0].displayName"
        />
        <h2
          class="m-0 text-base font-semibold min-w-0 flex-1 truncate"
          v-text="selectedUsers[0].displayName"
        />
      </div>
    </template>
    <template #actions>
      <div class="flex flex-wrap gap-2 justify-between w-full my-2 items-center">
        <div class="flex items-center">
          <item-filter
            v-if="groups.length"
            :allow-multiple="true"
            :filter-label="$gettext('Groups')"
            :filterable-attributes="['displayName']"
            :items="groups"
            :option-filter-label="$gettext('Filter groups')"
            :show-option-filter="true"
            class="me-2"
            display-name-attribute="displayName"
            filter-name="groups"
            @selection-change="filterGroups"
          >
            <template #image="{ item }">
              <oc-avatar :width="32" :userid="item.id" :user-name="item.displayName" />
            </template>
            <template #item="{ item, term }">
              <div class="ms-2"><oc-filter-highlight :text="item.displayName" :term="term" /></div>
            </template>
          </item-filter>
          <item-filter
            v-if="roles.length"
            :allow-multiple="true"
            :filter-label="$gettext('Roles')"
            :filterable-attributes="['displayName']"
            :items="roles"
            :option-filter-label="$gettext('Filter roles')"
            :show-option-filter="true"
            display-name-attribute="displayName"
            filter-name="roles"
            @selection-change="filterRoles"
          >
            <template #image="{ item }">
              <oc-avatar :width="32" :userid="item.id" :user-name="$gettext(item.displayName)" />
            </template>
            <template #item="{ item, term }">
              <div class="ms-2">
                <oc-filter-highlight :text="$gettext(item.displayName)" :term="term" />
              </div>
            </template>
          </item-filter>
        </div>
        <oc-search-bar
          v-model="searchTerm"
          class="w-full sm:w-3xs"
          :label="$gettext('Search')"
          :placeholder="$gettext('Search for users')"
          :is-rounded="false"
          button-hidden
          @search="
            (term) => {
              searchTerm = term
              searchUsers()
            }
          "
          @advanced-search="searchUsers"
        />
      </div>
    </template>
    <template #mainContent>
      <users-list :is-loading="isLoading" :roles="roles">
        <template #contextMenu>
          <context-actions :items="selectedUsers" />
        </template>
        <template #noResults>
          <no-content-message
            v-if="isFilteringMandatory && !isFilteringActive"
            img-src="images/illustrations/users.svg"
          >
            <template #message>
              <span v-text="$gettext('No users found')" />
            </template>
            <template #callToAction>
              <span v-text="$gettext('Please specify a filter to see results')" />
            </template>
          </no-content-message>
          <no-content-message v-else img-src="images/illustrations/users.svg">
            <template #message>
              <span v-text="$gettext('No users found')" />
            </template>
            <template #callToAction>
              <span v-text="$gettext('Try refining the search term or filters to get results')" />
            </template>
          </no-content-message>
        </template>
      </users-list>
    </template>
  </app-template>
</template>

<script setup lang="ts">
import AppTemplate from '../components/AppTemplate.vue'
import UsersList from '../components/Users/UsersList.vue'
import ContextActions from '../components/Users/ContextActions.vue'
import DetailsPanel from '../components/Users/SideBar/DetailsPanel.vue'
import EditPanel from '../components/Users/SideBar/EditPanel.vue'
import {
  useUserActionsDelete,
  useUserActionsRemoveFromGroups,
  useUserActionsAddToGroups,
  useUserActionsEditLogin,
  useUserActionsEditQuota
} from '../composables'
import { User, Group, AppRole, Quota } from '@opencloud-eu/web-client/graph/generated'
import {
  ItemFilter,
  NoContentMessage,
  eventBus,
  queryItemAsString,
  useClientService,
  useRoute,
  useRouteQuery,
  useRouter,
  SideBarPanel,
  SideBarPanelContext,
  useCapabilityStore,
  useConfigStore,
  QueryValue
} from '@opencloud-eu/web-pkg'
import { computed, ref, onBeforeUnmount, onMounted, unref, watch } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { isEqual, omit } from 'lodash-es'
import { storeToRefs } from 'pinia'
import { useUserSettingsStore } from '../composables/stores/userSettings'
import { call } from '@opencloud-eu/web-client'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'

const { $gettext } = useGettext()
const router = useRouter()
const route = useRoute()
const { graphUsersEditLoginAllowedDisabled } = storeToRefs(useCapabilityStore())
const clientService = useClientService()
const configStore = useConfigStore()

const userSettingsStore = useUserSettingsStore()
const { users, selectedUsers } = storeToRefs(userSettingsStore)

const groups = ref<Group[]>([])
const roles = ref<AppRole[]>([])
const applicationId = ref<string>()
const additionalUserDataLoadedForUserIds = ref<string[]>([])
const sideBarLoading = ref(false)
const isFilteringMandatory = configStore.options.userListRequiresFilter

const writableGroups = computed(() =>
  unref(groups).filter((g) => !g.groupTypes?.includes('ReadOnly'))
)

const { actions: deleteActions } = useUserActionsDelete()
const { actions: removeFromGroupsActions } = useUserActionsRemoveFromGroups({
  groups: writableGroups
})
const { actions: addToGroupsActions } = useUserActionsAddToGroups({ groups: writableGroups })
const { actions: editLoginActions } = useUserActionsEditLogin()
const { actions: editQuotaActions } = useUserActionsEditQuota()

function parseIdsQuery(value: QueryValue) {
  return queryItemAsString(value)?.split('+') || []
}

const searchTermQuery = useRouteQuery('q_displayName')
const filterGroupIds = ref(parseIdsQuery(unref(useRouteQuery('q_groups'))))
const filterRoleIds = ref(parseIdsQuery(unref(useRouteQuery('q_roles'))))
const searchTerm = ref(queryItemAsString(unref(searchTermQuery)) || '')
const appliedSearchTerm = ref(unref(searchTerm))

const isFilteringActive = computed(
  () =>
    !!unref(filterGroupIds).length || !!unref(filterRoleIds).length || !!unref(appliedSearchTerm)
)

function anyOf(ids: string[], condition: (id: string) => string) {
  return ids.length ? `(${ids.map(condition).join(' or ')})` : ''
}

const usersFilter = computed(() =>
  [
    anyOf(unref(filterGroupIds), (id) => `memberOf/any(m:m/id eq '${id}')`),
    anyOf(unref(filterRoleIds), (id) => `appRoleAssignments/any(m:m/appRoleId eq '${id}')`)
  ]
    .filter(Boolean)
    .join(' and ')
)

// the server searches the display name, the user name and the email. Quoted, the term may contain
// spaces and special characters, but no double quotes
const usersSearch = computed(() => {
  const term = unref(appliedSearchTerm).replaceAll('"', '')
  return term ? `"${term}"` : undefined
})

const loadGroupsTask = useTask(function* (signal) {
  groups.value = yield* call(
    clientService.graphAuthenticated.groups.listGroups({ orderBy: ['displayName'] }, { signal })
  )
}).restartable()

const loadAppRolesTask = useTask(function* (signal) {
  const applications = yield* call(
    clientService.graphAuthenticated.applications.listApplications({ signal })
  )
  roles.value = applications[0].appRoles
  applicationId.value = applications[0].id
})

const loadUsersTask = useTask(function* (signal) {
  if (isFilteringMandatory && !unref(isFilteringActive)) {
    return userSettingsStore.setUsers([])
  }

  const usersResponse = yield* call(
    clientService.graphAuthenticated.users.listUsers(
      {
        orderBy: ['displayName'],
        filter: unref(usersFilter),
        ...(unref(usersSearch) && { search: unref(usersSearch) }),
        expand: ['appRoleAssignments']
      },
      { signal }
    )
  )
  userSettingsStore.setUsers(usersResponse || [])
})

const loadResourcesTask = useTask(function* () {
  yield Promise.all([loadUsersTask.perform(), loadGroupsTask.perform(), loadAppRolesTask.perform()])
})

const isLoading = computed(
  () =>
    loadUsersTask.isRunning ||
    !loadUsersTask.last ||
    loadResourcesTask.isRunning ||
    !loadResourcesTask.last
)

/**
 * Reloads the user with all attributes, which are not loaded
 * while listing the users for performance reasons.
 */
const loadAdditionalUserDataTask = useTask(function* (signal, user: User) {
  if (unref(additionalUserDataLoadedForUserIds).includes(user.id)) {
    return
  }

  const data = yield* call(clientService.graphAuthenticated.users.getUser(user.id, {}, { signal }))
  additionalUserDataLoadedForUserIds.value.push(user.id)
  Object.assign(user, data)
})

function reloadFilteredUsers() {
  loadUsersTask.perform()
  if (unref(selectedUsers).length) {
    // only reset the selection if there is one because it messes with the focus otherwise
    userSettingsStore.setSelectedUsers([])
  }
  additionalUserDataLoadedForUserIds.value = []
  return router.push({ ...unref(route), query: { ...unref(route).query, page: '1' } })
}

function filterGroups(groups: Group[]) {
  filterGroupIds.value = groups.map((g) => g.id)
  return reloadFilteredUsers()
}

function filterRoles(roles: AppRole[]) {
  filterRoleIds.value = roles.map((r) => r.id)
  return reloadFilteredUsers()
}

async function searchUsers() {
  await router.push({
    ...unref(route),
    query: {
      ...omit(unref(route).query, 'q_displayName'),
      ...(unref(searchTerm) && { q_displayName: unref(searchTerm) })
    }
  })
  appliedSearchTerm.value = unref(searchTerm)
  return reloadFilteredUsers()
}

const batchActions = computed(() =>
  [
    ...unref(editQuotaActions),
    ...unref(addToGroupsActions),
    ...unref(removeFromGroupsActions),
    ...(unref(graphUsersEditLoginAllowedDisabled) ? [] : unref(editLoginActions)),
    ...unref(deleteActions)
  ].filter((item) => item.isVisible({ resources: unref(selectedUsers) }))
)

const breadcrumbs = computed(() => [
  {
    text: $gettext('Users'),
    onClick: () => {
      userSettingsStore.setSelectedUsers([])
      loadResourcesTask.perform()
    }
  }
])

const sideBarPanelContext = computed<SideBarPanelContext<unknown, unknown, User>>(() => ({
  parent: null,
  items: unref(selectedUsers)
}))

const sideBarAvailablePanels = [
  {
    name: 'DetailsPanel',
    icon: 'user',
    title: () => $gettext('Details'),
    component: DetailsPanel,
    componentAttrs: ({ items }) => ({
      user: items.length === 1 ? items[0] : null,
      users: items,
      usersCount: unref(users).length,
      roles: unref(roles)
    }),
    isRoot: () => true,
    isVisible: () => true
  },
  {
    name: 'EditPanel',
    icon: 'pencil',
    title: () => $gettext('Edit user'),
    component: EditPanel,
    isVisible: ({ items }) => items.length === 1,
    componentAttrs: ({ items }) => ({
      user: items.length === 1 ? items[0] : null,
      roles: unref(roles),
      groups: unref(groups),
      applicationId: unref(applicationId)
    })
  }
] satisfies SideBarPanel<unknown, unknown, User>[]

function updateSpaceQuota({ spaceId, quota }: { spaceId: string; quota: Quota }) {
  const user = unref(users).find((u) => u.drive?.id === spaceId)
  user.drive.quota = quota
  userSettingsStore.upsertUser(user)
}

watch(
  () => unref(selectedUsers).map(({ id }) => id),
  async (selectedIds, previousSelectedIds) => {
    // the quick action buttons select the user and the click also reaches the row,
    // which sets the same selection again
    if (isEqual(selectedIds, previousSelectedIds)) {
      return
    }
    sideBarLoading.value = true
    await Promise.all(unref(selectedUsers).map((user) => loadAdditionalUserDataTask.perform(user)))
    sideBarLoading.value = false
  }
)

let editQuotaActionEventToken: string

onMounted(async () => {
  await loadResourcesTask.perform()

  editQuotaActionEventToken = eventBus.subscribe(
    'app.admin-settings.users.user.quota.updated',
    updateSpaceQuota
  )
})

onBeforeUnmount(() => {
  userSettingsStore.reset()
  eventBus.unsubscribe('app.admin-settings.users.user.quota.updated', editQuotaActionEventToken)
})
</script>
