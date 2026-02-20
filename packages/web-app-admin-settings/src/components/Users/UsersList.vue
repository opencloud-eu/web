<template>
  <div id="user-list">
    <div class="user-filters flex justify-between flex-wrap items-end mx-4 mb-4">
      <slot name="filter" />
    </div>
    <app-loading-spinner v-if="isLoading" />
    <div v-else>
      <slot v-if="!users.length" name="noResults" />
      <oc-table
        v-else
        ref="tableRef"
        class="users-table"
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
            @update:model-value="
              allUsersSelected ? unselectAllUsers() : selectUsers(paginatedItems)
            "
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
          <user-avatar :user-id="item.id" :user-name="item.displayName" />
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
    </div>
  </div>
</template>

<script lang="ts">
import { useGettext } from 'vue3-gettext'
import {
  ComponentPublicInstance,
  computed,
  defineComponent,
  nextTick,
  onMounted,
  PropType,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import {
  AppLoadingSpinner,
  ContextMenuQuickAction,
  eventBus,
  Pagination,
  queryItemAsString,
  useFileListHeaderPosition,
  useIsTopBarSticky,
  useKeyboardActions,
  usePagination,
  useRouteQuery,
  UserAvatar,
  useSideBar
} from '@opencloud-eu/web-pkg'
import { AppRole, User } from '@opencloud-eu/web-client/graph/generated'
import { perPageDefault, perPageStoragePrefix } from '../../defaults'
import { storeToRefs } from 'pinia'
import { useUserSettingsStore } from '../../composables/stores/userSettings'
import {
  useKeyboardTableMouseActions,
  useKeyboardTableNavigation
} from '../../composables/keyboardActions'
import { findIndex } from 'lodash-es'
import Mark from 'mark.js'
import { OcDrop, OcTable } from '@opencloud-eu/design-system/components'
import { FieldType, SortDir } from '@opencloud-eu/design-system/helpers'
import { useCapabilityStore } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'UsersList',
  components: { UserAvatar, AppLoadingSpinner, ContextMenuQuickAction, Pagination },
  props: {
    roles: {
      type: Array as PropType<AppRole[]>,
      required: true
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const { $gettext } = useGettext()
    const { isSticky } = useIsTopBarSticky()
    const { openSideBar, openSideBarPanel } = useSideBar()

    const tableRef = useTemplateRef<ComponentPublicInstance<typeof OcTable>>('tableRef')
    const contextMenuDrops = ref<Record<string, ComponentPublicInstance<typeof OcDrop>>>({})
    const sortBy = ref('onPremisesSamAccountName')
    const sortDir = ref<SortDir>(SortDir.Asc)
    const { y: fileListHeaderY } = useFileListHeaderPosition('#admin-settings-app-bar')

    const lastSelectedUserIndex = ref(0)
    const lastSelectedUserId = ref<string>()
    const capabilityStore = useCapabilityStore()
    const { graphUsersEditLoginAllowedDisabled } = storeToRefs(capabilityStore)
    const userSettingsStore = useUserSettingsStore()
    const { users, selectedUsers } = storeToRefs(userSettingsStore)

    const isUserSelected = (user: User) => {
      return unref(selectedUsers).some((s) => s.id === user.id)
    }
    const selectUser = (selectedUser: User) => {
      lastSelectedUserIndex.value = findIndex(unref(users), (u) => u.id === selectedUser.id)
      lastSelectedUserId.value = selectedUser.id
      keyActions.resetSelectionCursor()

      const isUserSelected = unref(selectedUsers).find((user) => user.id === selectedUser.id)
      if (!isUserSelected) {
        return userSettingsStore.addSelectedUser(selectedUser)
      }

      userSettingsStore.setSelectedUsers(
        unref(selectedUsers).filter((user) => user.id !== selectedUser.id)
      )
    }

    const unselectAllUsers = () => {
      userSettingsStore.setSelectedUsers([])
    }

    const selectUsers = (users: User[]) => {
      userSettingsStore.setSelectedUsers(users)
    }

    const showDetails = (user: User) => {
      if (!isUserSelected(user)) {
        selectUser(user)
      }
      openSideBar()
    }

    const showEditPanel = (user: User) => {
      if (!isUserSelected(user)) {
        selectUser(user)
      }
      openSideBarPanel('EditPanel')
    }

    const showUserAssigmentPanel = (user: User) => {
      if (!isUserSelected(user)) {
        selectUser(user)
      }
      openSideBarPanel('UserAssignmentsPanel')
    }

    const rowClicked = (data: [User, MouseEvent | KeyboardEvent]) => {
      const resource = data[0]
      const eventData = data[1]
      const isCheckboxClicked =
        (eventData?.target as HTMLElement).getAttribute('type') === 'checkbox'

      const contextActionClicked =
        (eventData?.target as HTMLElement)?.closest('div')?.id === 'oc-files-context-menu'
      if (contextActionClicked) {
        return
      }

      if (eventData?.metaKey) {
        return eventBus.publish('app.resources.list.clicked.meta', resource)
      }
      if (eventData?.shiftKey) {
        return eventBus.publish('app.resources.list.clicked.shift', {
          resource,
          skipTargetSelection: isCheckboxClicked
        })
      }
      if (isCheckboxClicked) {
        return
      }
      unselectAllUsers()
      selectUser(resource)
    }
    const showContextMenuOnBtnClick = (event: MouseEvent | KeyboardEvent, user: User) => {
      unref(contextMenuDrops)[user.id]?.show({ event })
    }
    const showContextMenuOnRightClick = (event: MouseEvent, user: User) => {
      event.preventDefault()
      if (!isUserSelected(user)) {
        userSettingsStore.setSelectedUsers([user])
      }
      unref(contextMenuDrops)[user.id]?.show({ event, useMouseAnchor: true })
    }

    const getRoleDisplayNameByUser = (user: User) => {
      const assignedRole = user.appRoleAssignments[0]

      return (
        $gettext(
          props.roles.find((role) => role.id === assignedRole?.appRoleId)?.displayName || ''
        ) || '-'
      )
    }

    const orderBy = (list: User[], prop: string, desc: boolean) => {
      return [...list].sort((user1, user2) => {
        let a: string, b: string

        switch (prop) {
          case 'role':
            a = getRoleDisplayNameByUser(user1)
            b = getRoleDisplayNameByUser(user2)
            break
          case 'accountEnabled':
            a = ('accountEnabled' in user1 ? user1.accountEnabled : true).toString()
            b = ('accountEnabled' in user2 ? user2.accountEnabled : true).toString()
            break
          default:
            a = user1[prop as keyof User].toString() || ''
            b = user2[prop as keyof User].toString() || ''
        }

        return desc ? b.localeCompare(a) : a.localeCompare(b)
      })
    }

    const items = computed(() => {
      return orderBy(unref(users), unref(sortBy), unref(sortDir) === SortDir.Desc)
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

    const fields = computed<FieldType[]>(() => {
      const cols: FieldType[] = [
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
          sortable: true,
          tdClass: 'mark-element'
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
        }
      ]

      if (!graphUsersEditLoginAllowedDisabled.value) {
        cols.push({
          name: 'accountEnabled',
          title: $gettext('Login'),
          type: 'slot',
          sortable: true
        })
      }

      cols.push({
        name: 'actions',
        title: $gettext('Actions'),
        sortable: false,
        type: 'slot',
        alignH: 'right'
      })

      return cols
    })

    let markInstance: Mark | undefined
    onMounted(async () => {
      await nextTick()
      markInstance = new Mark('.mark-element')
    })
    const displayNameQuery = useRouteQuery('q_displayName')
    watch([displayNameQuery, paginatedItems, tableRef], () => {
      markInstance?.unmark()
      const filterTerm = queryItemAsString(unref(displayNameQuery))
      if (filterTerm) {
        markInstance?.mark(filterTerm, {
          element: 'span',
          className: 'mark-highlight'
        })
      }
    })

    return {
      showDetails,
      showEditPanel,
      showUserAssigmentPanel,
      isUserSelected,
      rowClicked,
      contextMenuDrops,
      showContextMenuOnBtnClick,
      showContextMenuOnRightClick,
      fileListHeaderY,
      getRoleDisplayNameByUser,
      items,
      sortBy,
      sortDir,
      paginatedItems,
      currentPage,
      totalPages,
      orderBy,
      selectedUsers,
      selectUser,
      selectUsers,
      unselectAllUsers,
      users,
      isSticky,
      tableRef,
      fields
    }
  },
  computed: {
    allUsersSelected() {
      return this.paginatedItems.length === this.selectedUsers.length
    },
    footerTextTotal() {
      return this.$gettext('%{userCount} users in total', {
        userCount: this.users.length.toString()
      })
    },
    highlighted() {
      return this.selectedUsers.map((user) => user.id)
    }
  },
  methods: {
    handleSort(event: { sortBy: string; sortDir: SortDir }) {
      this.sortBy = event.sortBy
      this.sortDir = event.sortDir
    },
    getSelectUserLabel(user: User) {
      return this.$gettext('Select %{ user }', { user: user.displayName }, true)
    }
  }
})
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
