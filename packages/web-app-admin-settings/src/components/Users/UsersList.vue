<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <slot v-if="!users.length" name="noResults" />
    <oc-table
      v-else
      class="users-table [&_tbody_tr]:select-none"
      :class="{ 'users-table-squashed': isSideBarOpen }"
      :sort-by="sortBy"
      :sort-dir="sortDir"
      :fields="fields"
      :data="paginatedItems"
      :highlighted="highlighted"
      :sticky="isSticky"
      :header-position="fileListHeaderY"
      :hover="true"
      padding-x="medium"
      @sort="handleSort"
      @contextmenu-clicked="(el, event, item) => showContextMenuOnRightClick(event, item)"
      @highlight="rowClicked"
    >
      <template #selectHeader>
        <span class="sr-only">{{ $gettext('Select users') }}</span>
        <oc-checkbox
          size="large"
          :label="$gettext('Select all users')"
          :model-value="allUsersSelected"
          :label-hidden="true"
          @update:model-value="allUsersSelected ? unselectAllUsers() : selectUsers(paginatedItems)"
        />
      </template>
      <template #select="{ item }">
        <oc-checkbox
          size="large"
          :model-value="isUserSelected(item)"
          :option="item"
          :label="getSelectUserLabel(item)"
          :label-hidden="true"
          @update:model-value="selectUser(item)"
          @click.stop="rowClicked([item, $event])"
        />
      </template>
      <template #avatarHeader>
        <span class="sr-only">{{ $gettext('Avatar') }}</span>
      </template>
      <template #avatar="{ item }">
        <user-avatar :user-id="item.id" :user-name="item.displayName" :width="32" />
      </template>
      <template #displayName="{ item }">
        <oc-filter-highlight :text="item.displayName" :term="filterTerm" />
      </template>
      <template #role="{ item }">
        <template v-if="item.appRoleAssignments">{{ getRoleDisplayNameByUser(item) }}</template>
      </template>
      <template #accountEnabled="{ item }">
        <span v-if="item.accountEnabled === false" class="flex items-center">
          <oc-icon name="stop-circle" fill-type="line" class="mr-2" /><span
            v-text="$gettext('Forbidden')"
          />
        </span>
        <span v-else class="flex items-center">
          <oc-icon name="play-circle" fill-type="line" class="mr-2" /><span
            v-text="$gettext('Allowed')"
          />
        </span>
      </template>
      <template #actions="{ item }">
        <oc-button
          v-oc-tooltip="$gettext('Show details')"
          :aria-label="$gettext('Show details')"
          appearance="raw"
          class="ml-1 quick-action-button p-1 users-table-btn-details"
          @click="showDetails(item)"
        >
          <oc-icon name="information" fill-type="line" />
        </oc-button>
        <oc-button
          v-oc-tooltip="$gettext('Edit')"
          :aria-label="$gettext('Edit')"
          appearance="raw"
          class="ml-1 quick-action-button p-1 users-table-btn-edit"
          @click="showEditPanel(item)"
        >
          <oc-icon name="pencil" fill-type="line" />
        </oc-button>
        <context-menu-quick-action
          :ref="(el: any) => (contextMenuDrops[item.id] = el?.drop)"
          :item="item"
          :title="item.displayName"
          class="users-table-btn-action-dropdown"
          @quick-action-clicked="showContextMenuOnBtnClick($event, item)"
        >
          <template #contextMenu>
            <slot name="contextMenu" :user="item" />
          </template>
        </context-menu-quick-action>
      </template>
      <template #footer>
        <pagination :pages="totalPages" :current-page="currentPage" />
        <div class="text-center w-full my-2">
          <p class="text-role-on-surface-variant">{{ footerTextTotal }}</p>
        </div>
      </template>
    </oc-table>
  </template>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import { ComponentPublicInstance, computed, ref, unref } from 'vue'
import {
  AppLoadingSpinner,
  ContextMenuQuickAction,
  eventBus,
  Pagination,
  queryItemAsString,
  useCapabilityStore,
  useFileListHeaderPosition,
  useIsTopBarSticky,
  useKeyboardActions,
  usePagination,
  useRouteQuery,
  UserAvatar,
  useSideBar,
  useSort,
  createVirtualCursorElement,
  SortField
} from '@opencloud-eu/web-pkg'
import { AppRole, AppRoleAssignment, User } from '@opencloud-eu/web-client/graph/generated'
import { perPageDefault, perPageStoragePrefix } from '../../defaults'
import { storeToRefs } from 'pinia'
import { useUserSettingsStore } from '../../composables/stores/userSettings'
import {
  useKeyboardTableMouseActions,
  useKeyboardTableNavigation
} from '../../composables/keyboardActions'
import { findIndex } from 'lodash-es'
import { OcDrop, OcFilterHighlight } from '@opencloud-eu/design-system/components'
import { FieldType, SortDir } from '@opencloud-eu/design-system/helpers'

const { roles, isLoading = false } = defineProps<{ roles: AppRole[]; isLoading?: boolean }>()

defineSlots<{
  noResults?: () => unknown
  contextMenu?: (props: { user: User }) => unknown
}>()

const { $gettext } = useGettext()
const { isSticky } = useIsTopBarSticky()
const sideBarStore = useSideBar()
const { openSideBar, openSideBarPanel } = sideBarStore
const { isSideBarOpen } = storeToRefs(sideBarStore)

const contextMenuDrops = ref<Record<string, ComponentPublicInstance<typeof OcDrop>>>({})
const { y: fileListHeaderY } = useFileListHeaderPosition('#admin-settings-app-bar')

const lastSelectedUserIndex = ref(0)
const lastSelectedUserId = ref<string>()
const capabilityStore = useCapabilityStore()
const { graphUsersEditLoginAllowedDisabled } = storeToRefs(capabilityStore)
const userSettingsStore = useUserSettingsStore()
const { users, selectedUsers } = storeToRefs(userSettingsStore)

const displayNameQuery = useRouteQuery('q_displayName')
const filterTerm = computed(() => queryItemAsString(unref(displayNameQuery)))

function getRoleDisplayName(appRoleAssignments: AppRoleAssignment[]) {
  const assignedRole = appRoleAssignments?.[0]
  const role = roles.find(({ id }) => id === assignedRole?.appRoleId)
  return $gettext(role?.displayName || '') || '-'
}

const sortFields: SortField[] = [
  { name: 'onPremisesSamAccountName', sortable: true, sortDir: SortDir.Asc },
  { name: 'displayName', sortable: true, sortDir: SortDir.Asc },
  { name: 'mail', sortable: true, sortDir: SortDir.Asc },
  {
    name: 'role',
    prop: 'appRoleAssignments',
    sortable: getRoleDisplayName,
    sortDir: SortDir.Asc
  },
  {
    name: 'accountEnabled',
    sortable: (accountEnabled?: boolean) => (accountEnabled ?? true).toString(),
    sortDir: SortDir.Asc
  }
]
const { sortBy, sortDir, items, handleSort } = useSort<User>({
  items: users,
  fields: sortFields
})

const {
  items: paginatedItems,
  page: currentPage,
  total: totalPages
} = usePagination({ items, perPageDefault, perPageStoragePrefix })

const keyActions = useKeyboardActions()
useKeyboardTableNavigation(
  keyActions,
  paginatedItems,
  selectedUsers,
  lastSelectedUserIndex,
  lastSelectedUserId
)
useKeyboardTableMouseActions(
  keyActions,
  paginatedItems,
  selectedUsers,
  lastSelectedUserIndex,
  lastSelectedUserId
)

const allUsersSelected = computed(
  () => unref(paginatedItems).length === unref(selectedUsers).length
)
const highlighted = computed(() => unref(selectedUsers).map((user) => user.id))
const footerTextTotal = computed(() =>
  $gettext('%{userCount} users in total', { userCount: unref(users).length.toString() })
)

const fields = computed<FieldType[]>(() => [
  {
    name: 'select',
    title: '',
    type: 'slot',
    width: 'shrink',
    headerType: 'slot'
  },
  {
    name: 'avatar',
    title: '',
    type: 'slot',
    width: 'shrink',
    headerType: 'slot',
    sortable: false
  },
  {
    name: 'onPremisesSamAccountName',
    title: $gettext('User name'),
    sortable: true
  },
  {
    name: 'displayName',
    title: $gettext('First and last name'),
    type: 'slot',
    sortable: true
  },
  {
    name: 'mail',
    title: $gettext('Email'),
    sortable: true
  },
  {
    name: 'role',
    title: $gettext('Role'),
    type: 'slot',
    sortable: true
  },
  ...(unref(graphUsersEditLoginAllowedDisabled)
    ? []
    : [
        {
          name: 'accountEnabled',
          title: $gettext('Login'),
          type: 'slot',
          sortable: true
        } satisfies FieldType
      ]),
  {
    name: 'actions',
    title: $gettext('Actions'),
    sortable: false,
    type: 'slot',
    alignH: 'right'
  }
])

function isUserSelected(user: User) {
  return unref(selectedUsers).some((s) => s.id === user.id)
}

function selectUser(user: User) {
  lastSelectedUserIndex.value = findIndex(unref(users), (u) => u.id === user.id)
  lastSelectedUserId.value = user.id
  keyActions.resetSelectionCursor()

  if (!isUserSelected(user)) {
    return userSettingsStore.addSelectedUser(user)
  }

  userSettingsStore.setSelectedUsers(unref(selectedUsers).filter((u) => u.id !== user.id))
}

function selectUsers(users: User[]) {
  userSettingsStore.setSelectedUsers(users)
}

function unselectAllUsers() {
  userSettingsStore.setSelectedUsers([])
}

function getSelectUserLabel(user: User) {
  return $gettext('Select %{ user }', { user: user.displayName })
}

function getRoleDisplayNameByUser(user: User) {
  return getRoleDisplayName(user.appRoleAssignments)
}

function showDetails(user: User) {
  if (!isUserSelected(user)) {
    selectUser(user)
  }
  openSideBar()
}

function showEditPanel(user: User) {
  if (!isUserSelected(user)) {
    selectUser(user)
  }
  openSideBarPanel('EditPanel')
}

function rowClicked([user, event]: [User, MouseEvent | KeyboardEvent]) {
  const target = event?.target as HTMLElement
  const isCheckboxClicked = target?.getAttribute('type') === 'checkbox'
  const contextActionClicked = target?.closest('div')?.id === 'oc-files-context-menu'
  if (contextActionClicked) {
    return
  }

  if (event?.metaKey) {
    return eventBus.publish('app.resources.list.clicked.meta', user)
  }
  if (event?.shiftKey) {
    return eventBus.publish('app.resources.list.clicked.shift', {
      resource: user,
      skipTargetSelection: isCheckboxClicked
    })
  }
  if (isCheckboxClicked) {
    return
  }

  unselectAllUsers()
  selectUser(user)
}

function showContextMenuOnBtnClick(event: MouseEvent | KeyboardEvent, user: User) {
  unref(contextMenuDrops)[user.id]?.show({ event })
}

function showContextMenuOnRightClick(event: MouseEvent, user: User) {
  event.preventDefault()
  if (!isUserSelected(user)) {
    userSettingsStore.setSelectedUsers([user])
  }
  const anchorElement = createVirtualCursorElement(event)
  unref(contextMenuDrops)[user.id]?.show({ anchorElement })
}
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .users-table .oc-table-header-cell-actions,
  .users-table .oc-table-data-cell-actions {
    @apply whitespace-nowrap;
  }

  /* Hidden by default, visible from xl and up */
  .users-table .oc-table-header-cell-role,
  .users-table .oc-table-data-cell-role,
  .users-table .oc-table-header-cell-accountEnabled,
  .users-table .oc-table-data-cell-accountEnabled,
  .users-table .oc-table-header-cell-mail,
  .users-table .oc-table-data-cell-mail {
    @apply hidden lg:table-cell;
  }

  /* DisplayName visible from lg and up */
  .users-table .oc-table-header-cell-displayName,
  .users-table .oc-table-data-cell-displayName {
    @apply hidden md:table-cell;
  }

  /* Squashed variant */
  .users-table-squashed .oc-table-header-cell-role,
  .users-table-squashed .oc-table-data-cell-role,
  .users-table-squashed .oc-table-header-cell-accountEnabled,
  .users-table-squashed .oc-table-data-cell-accountEnabled {
    @apply hidden 2xl:table-cell;
  }

  .users-table-squashed .oc-table-header-cell-displayName,
  .users-table-squashed .oc-table-data-cell-displayName {
    @apply hidden xl:table-cell;
  }

  .users-table-squashed .oc-table-header-cell-mail,
  .users-table-squashed .oc-table-data-cell-mail {
    @apply hidden lg:table-cell;
  }
}
</style>
