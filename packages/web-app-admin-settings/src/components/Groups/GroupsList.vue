<template>
  <div id="group-list">
    <div class="group-filters flex justify-end flex-wrap items-end mx-4 mb-4">
      <oc-text-input
        id="groups-filter"
        v-model="filterTerm"
        class="w-3xs"
        :label="$gettext('Search')"
        autocomplete="off"
      />
    </div>
    <oc-table
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
      @contextmenu-clicked="showContextMenuOnRightClick"
      @highlight="rowClicked"
    >
      <template #selectHeader>
        <oc-checkbox
          size="large"
          :label="$gettext('Select all groups')"
          :model-value="allGroupsSelected"
          :label-hidden="true"
          @update:model-value="
            allGroupsSelected ? unselectAllGroups() : selectGroups(paginatedItems)
          "
        />
      </template>
      <template #select="rowData">
        <oc-checkbox
          size="large"
          :model-value="isGroupSelected(rowData.item)"
          :option="rowData.item"
          :label="getSelectGroupLabel(rowData.item)"
          :label-hidden="true"
          @update:model-value="selectGroup(rowData.item)"
          @click.stop="rowClicked([rowData.item, $event])"
        />
      </template>
      <template #avatar="rowData">
        <OcAvatar
          :width="32"
          :userid="rowData.item.id"
          :user-name="rowData.item.displayName"
          background-color="var(--oc-role-secondary)"
        />
      </template>
      <template #displayName="rowData">
        <div class="flex items-center">
          {{ rowData.item.displayName }}
          <oc-icon
            v-if="rowData.item.groupTypes?.includes('ReadOnly')"
            v-oc-tooltip="readOnlyLabel"
            name="lock"
            size="small"
            fill-type="line"
            class="ml-2"
            :accessible-label="readOnlyLabel"
          />
        </div>
      </template>
      <template #members="rowData">
        {{ rowData.item.members.length }}
      </template>
      <template #actions="{ item }">
        <oc-button
          v-oc-tooltip="$gettext('Show details')"
          :aria-label="$gettext('Show details')"
          appearance="raw"
          class="ml-1 quick-action-button p-1 groups-table-btn-details"
          @click="showDetails(item)"
        >
          <oc-icon name="information" fill-type="line" />
        </oc-button>
        <oc-button
          v-if="!item.groupTypes?.includes('ReadOnly')"
          v-oc-tooltip="$gettext('Edit')"
          :aria-label="$gettext('Edit')"
          appearance="raw"
          class="ml-1 quick-action-button p-1 groups-table-btn-edit"
          @click="showEditPanel(item)"
        >
          <oc-icon name="pencil" fill-type="line" />
        </oc-button>
        <context-menu-quick-action
          ref="contextMenuButtonRef"
          :item="item"
          :title="item.displayName"
          class="groups-table-btn-action-dropdown"
          @quick-action-clicked="showContextMenuOnBtnClick($event, item)"
        >
          <template #contextMenu>
            <slot name="contextMenu" :group="item" />
          </template>
        </context-menu-quick-action>
      </template>
      <template #footer>
        <pagination :pages="totalPages" :current-page="currentPage" />
        <div class="text-center w-full my-2">
          <p class="text-role-on-surface-variant">{{ footerTextTotal }}</p>
          <p v-if="filterTerm" class="text-role-on-surface-variant">{{ footerTextFilter }}</p>
        </div>
      </template>
    </oc-table>
  </div>
</template>

<script lang="ts">
import {
  ComponentPublicInstance,
  computed,
  defineComponent,
  nextTick,
  onMounted,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import Fuse from 'fuse.js'
import Mark from 'mark.js'
import {
  ContextMenuBtnClickEventData,
  ContextMenuQuickAction,
  defaultFuseOptions,
  displayPositionedDropdown,
  eventBus,
  Pagination,
  SideBarEventTopics,
  SortDir,
  useFileListHeaderPosition,
  useIsTopBarSticky,
  useKeyboardActions,
  usePagination,
  useRoute,
  useRouter
} from '@opencloud-eu/web-pkg'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { useGettext } from 'vue3-gettext'
import { perPageDefault, perPageStoragePrefix } from '../../defaults'
import {
  useKeyboardTableMouseActions,
  useKeyboardTableNavigation
} from '../../composables/keyboardActions'
import { useGroupSettingsStore } from '../../composables'
import { storeToRefs } from 'pinia'
import { findIndex } from 'lodash-es'
import { FieldType } from '@opencloud-eu/design-system/helpers'

export default defineComponent({
  name: 'GroupsList',
  components: { ContextMenuQuickAction, Pagination },
  setup() {
    const { $gettext } = useGettext()
    const { y: fileListHeaderY } = useFileListHeaderPosition('#admin-settings-app-bar')
    const contextMenuButtonRef =
      useTemplateRef<ComponentPublicInstance<typeof ContextMenuQuickAction>>('contextMenuButtonRef')
    const sortBy = ref<keyof Group>('displayName')
    const sortDir = ref<SortDir>(SortDir.Asc)
    const filterTerm = ref('')
    const router = useRouter()
    const route = useRoute()
    const { isSticky } = useIsTopBarSticky()

    const lastSelectedGroupIndex = ref(0)
    const lastSelectedGroupId = ref<string>()

    const groupSettingsStore = useGroupSettingsStore()
    const { groups, selectedGroups } = storeToRefs(groupSettingsStore)

    const isGroupSelected = (group: Group) => {
      return unref(selectedGroups).some((s) => s.id === group.id)
    }
    const selectGroup = (selectedGroup: Group) => {
      lastSelectedGroupIndex.value = findIndex(unref(groups), (g) => g.id === selectedGroup.id)
      lastSelectedGroupId.value = selectedGroup.id
      keyActions.resetSelectionCursor()

      const isGroupSelected = unref(selectedGroups).find((group) => group.id === selectedGroup.id)
      if (!isGroupSelected) {
        return groupSettingsStore.addSelectedGroup(selectedGroup)
      }

      groupSettingsStore.setSelectedGroups(
        unref(selectedGroups).filter((group) => group.id !== selectedGroup.id)
      )
    }

    const unselectAllGroups = () => {
      groupSettingsStore.setSelectedGroups([])
    }

    const selectGroups = (groups: Group[]) => {
      groupSettingsStore.setSelectedGroups(groups)
    }

    const showDetails = (group: Group) => {
      if (!isGroupSelected(group)) {
        selectGroup(group)
      }
      eventBus.publish(SideBarEventTopics.open)
    }
    const rowClicked = (data: [Group, MouseEvent]) => {
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

      unselectAllGroups()
      selectGroup(resource)
    }
    const showContextMenuOnBtnClick = (data: ContextMenuBtnClickEventData, group: Group) => {
      const { dropdown, event } = data
      if (dropdown?.tippy === undefined) {
        return
      }
      if (!isGroupSelected(group)) {
        groupSettingsStore.setSelectedGroups([group])
      }
      displayPositionedDropdown(dropdown.tippy, event, unref(contextMenuButtonRef))
    }
    const showContextMenuOnRightClick = (
      row: ComponentPublicInstance<unknown>,
      event: MouseEvent,
      group: Group
    ) => {
      event.preventDefault()
      const dropdown = row.$el.getElementsByClassName('groups-table-btn-action-dropdown')[0]
      if (dropdown === undefined) {
        return
      }
      if (!isGroupSelected(group)) {
        groupSettingsStore.setSelectedGroups([group])
      }
      displayPositionedDropdown(dropdown._tippy, event, unref(contextMenuButtonRef))
    }

    const showEditPanel = (group: Group) => {
      if (!isGroupSelected(group)) {
        selectGroup(group)
      }
      eventBus.publish(SideBarEventTopics.openWithPanel, 'EditPanel')
    }

    const readOnlyLabel = computed(() => $gettext("This group is read-only and can't be edited"))

    const filter = (groups: Group[], filterTerm: string) => {
      if (!(filterTerm || '').trim()) {
        return groups
      }
      const groupsSearchEngine = new Fuse(groups, { ...defaultFuseOptions, keys: ['displayName'] })
      return groupsSearchEngine.search(filterTerm).map((r) => r.item)
    }

    const orderBy = (list: Group[], prop: keyof Group, desc: boolean) => {
      return [...list].sort((a, b) => {
        const c = a[prop]?.toString() || ''
        const d = b[prop]?.toString() || ''
        return desc ? d.localeCompare(c) : c.localeCompare(d)
      })
    }

    const items = computed(() => {
      return orderBy(
        filter(unref(groups), unref(filterTerm)),
        unref(sortBy),
        unref(sortDir) === SortDir.Desc
      )
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
      selectedGroups,
      lastSelectedGroupIndex,
      lastSelectedGroupId
    )
    useKeyboardTableMouseActions(
      keyActions,
      paginatedItems,
      selectedGroups,
      lastSelectedGroupIndex,
      lastSelectedGroupId
    )

    const fields = computed<FieldType[]>(() => {
      return [
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
          width: 'shrink'
        },
        {
          name: 'displayName',
          title: $gettext('Group name'),
          type: 'slot',
          sortable: true,
          tdClass: 'mark-element'
        },
        {
          name: 'members',
          title: $gettext('Members'),
          type: 'slot',
          sortable: true
        },
        {
          name: 'actions',
          title: $gettext('Actions'),
          sortable: false,
          type: 'slot',
          alignH: 'right'
        }
      ]
    })

    watch(currentPage, () => {
      unselectAllGroups()
    })

    watch(filterTerm, async () => {
      await unref(router).push({ ...unref(route), query: { ...unref(route).query, page: '1' } })
    })

    let markInstance: Mark | undefined
    onMounted(async () => {
      await nextTick()
      markInstance = new Mark('.mark-element')
    })
    watch([filterTerm, paginatedItems], () => {
      markInstance?.unmark()
      if (unref(filterTerm)) {
        markInstance?.mark(unref(filterTerm), {
          element: 'span',
          className: 'mark-highlight'
        })
      }
    })

    return {
      showDetails,
      rowClicked,
      isGroupSelected,
      showContextMenuOnBtnClick,
      showContextMenuOnRightClick,
      fileListHeaderY,
      contextMenuButtonRef,
      showEditPanel,
      readOnlyLabel,
      filterTerm,
      sortBy,
      sortDir,
      items,
      paginatedItems,
      currentPage,
      totalPages,
      filter,
      orderBy,
      selectedGroups,
      unselectAllGroups,
      selectGroups,
      selectGroup,
      groups,
      isSticky,
      fields
    }
  },
  computed: {
    allGroupsSelected() {
      return this.paginatedItems.length === this.selectedGroups.length
    },
    footerTextTotal() {
      return this.$gettext('%{groupCount} groups in total', {
        groupCount: this.groups.length.toString()
      })
    },
    footerTextFilter() {
      return this.$gettext('%{groupCount} matching groups', {
        groupCount: this.items.length.toString()
      })
    },
    highlighted() {
      return this.selectedGroups.map((group) => group.id)
    }
  },
  methods: {
    handleSort(event: { sortBy: keyof Group; sortDir: SortDir }) {
      this.sortBy = event.sortBy
      this.sortDir = event.sortDir
    },
    getSelectGroupLabel(group: Group) {
      return this.$gettext('Select %{ group }', { group: group.displayName }, true)
    }
  }
})
</script>
