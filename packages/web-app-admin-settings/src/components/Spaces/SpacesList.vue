<template>
  <div id="space-list">
    <div class="space-filters flex justify-end flex-wrap items-end mx-4 mb-4">
      <oc-text-input
        id="spaces-filter"
        v-model="filterTerm"
        class="w-3xs"
        :label="$gettext('Search')"
        autocomplete="off"
      />
    </div>
    <oc-table
      class="settings-spaces-table"
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
      @highlight="fileClicked"
    >
      <template #selectHeader>
        <oc-checkbox
          size="large"
          :label="$gettext('Select all spaces')"
          :model-value="allSpacesSelected"
          :label-hidden="true"
          @update:model-value="
            allSpacesSelected ? unselectAllSpaces() : selectSpaces(paginatedItems)
          "
        />
      </template>
      <template #select="{ item }">
        <oc-checkbox
          size="large"
          :model-value="isSpaceSelected(item)"
          :option="item"
          :label="getSelectSpaceLabel(item)"
          :label-hidden="true"
          @update:model-value="selectSpace(item)"
          @click.stop="fileClicked([item, $event])"
        />
      </template>
      <template #icon>
        <oc-icon name="layout-grid" />
      </template>
      <template #name="{ item }">
        <span :data-test-space-name="item.name" v-text="item.name" />
      </template>
      <template #manager="{ item }">
        {{ getManagerNames(item) }}
      </template>
      <template #members="{ item }">
        {{ getMemberCount(item) }}
      </template>
      <template #totalQuota="{ item }"> {{ getTotalQuota(item) }}</template>
      <template #usedQuota="{ item }"> {{ getUsedQuota(item) }}</template>
      <template #remainingQuota="{ item }"> {{ getRemainingQuota(item) }}</template>
      <template #mdate="{ item }">
        <span
          v-oc-tooltip="formatDate(item.mdate)"
          tabindex="0"
          v-text="formatDateRelative(item.mdate)"
        />
      </template>
      <template #status="{ item }">
        <span class="flex items-center">
          <oc-icon
            v-oc-tooltip="item.disabled ? $gettext('Disabled') : $gettext('Enabled')"
            :name="item.disabled ? 'stop-circle' : 'play-circle'"
            size="small"
            fill-type="line"
          />
        </span>
      </template>
      <template #actions="{ item }">
        <div class="spaces-list-actions">
          <oc-button
            v-oc-tooltip="spaceDetailsLabel"
            :aria-label="spaceDetailsLabel"
            appearance="raw"
            class="ml-1 quick-action-button p-1 spaces-table-btn-details"
            @click.stop.prevent="showDetailsForSpace(item)"
          >
            <oc-icon name="information" fill-type="line" />
          </oc-button>
          <context-menu-quick-action
            ref="contextMenuButtonRef"
            :item="item"
            :title="item.name"
            class="spaces-table-btn-action-dropdown"
            @quick-action-clicked="showContextMenuOnBtnClick($event, item)"
          >
            <template #contextMenu>
              <slot name="contextMenu" :space="item" />
            </template>
          </context-menu-quick-action>
        </div>
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

<script setup lang="ts">
import {
  formatDateFromJSDate,
  formatRelativeDateFromJSDate,
  displayPositionedDropdown,
  formatFileSize,
  defaultFuseOptions,
  useKeyboardActions,
  ContextMenuBtnClickEventData,
  useIsTopBarSticky,
  useSharesStore
} from '@opencloud-eu/web-pkg'
import { ComponentPublicInstance, computed, nextTick, onMounted, ref, unref, watch } from 'vue'
import { getSpaceManagers, SpaceResource } from '@opencloud-eu/web-client'
import Mark from 'mark.js'
import Fuse from 'fuse.js'
import { useGettext } from 'vue3-gettext'
import { eventBus, SortDir } from '@opencloud-eu/web-pkg'
import { SideBarEventTopics } from '@opencloud-eu/web-pkg'
import { ContextMenuQuickAction } from '@opencloud-eu/web-pkg'
import {
  useFileListHeaderPosition,
  useRoute,
  useRouter,
  usePagination
} from '@opencloud-eu/web-pkg'
import { Pagination } from '@opencloud-eu/web-pkg'
import { perPageDefault, perPageStoragePrefix } from '../../defaults'
import { findIndex } from 'lodash-es'
import {
  useKeyboardTableMouseActions,
  useKeyboardTableNavigation
} from '../../composables/keyboardActions'
import { useSpaceSettingsStore } from '../../composables'
import { storeToRefs } from 'pinia'
import { FieldType } from '@opencloud-eu/design-system/helpers'

const router = useRouter()
const route = useRoute()
const language = useGettext()
const { $gettext } = language
const { isSticky } = useIsTopBarSticky()
const sharesStore = useSharesStore()

const { y: fileListHeaderY } = useFileListHeaderPosition('#admin-settings-app-bar')
const contextMenuButtonRef = ref(undefined)
const sortBy = ref('name')
const sortDir = ref(SortDir.Asc)
const filterTerm = ref('')
const markInstance = ref(undefined)

const lastSelectedSpaceIndex = ref(0)
const lastSelectedSpaceId = ref(null)

const spaceSettingsStore = useSpaceSettingsStore()
const { spaces, selectedSpaces } = storeToRefs(spaceSettingsStore)

const highlighted = computed(() => unref(selectedSpaces).map((s) => s.id))
const footerTextTotal = computed(() => {
  return $gettext('%{spaceCount} spaces in total', {
    spaceCount: unref(spaces).length.toString()
  })
})
const footerTextFilter = computed(() => {
  return $gettext('%{spaceCount} matching spaces', {
    spaceCount: unref(items).length.toString()
  })
})

const orderBy = (list: SpaceResource[], prop: string, desc: boolean) => {
  return [...list].sort((s1, s2) => {
    let a: string, b: string
    const numeric = ['totalQuota', 'usedQuota', 'remainingQuota'].includes(prop)

    switch (prop) {
      case 'members':
        a = getMemberCount(s1).toString()
        b = getMemberCount(s2).toString()
        break
      case 'totalQuota':
        a = (s1.spaceQuota.total || 0).toString()
        b = (s2.spaceQuota.total || 0).toString()
        break
      case 'usedQuota':
        a = (s1.spaceQuota.used || 0).toString()
        b = (s2.spaceQuota.used || 0).toString()
        break
      case 'remainingQuota':
        a = (s1.spaceQuota.remaining || 0).toString()
        b = (s2.spaceQuota.remaining || 0).toString()
        break
      case 'status':
        a = s1.disabled.toString()
        b = s2.disabled.toString()
        break
      default:
        a = s1[prop as keyof SpaceResource].toString() || ''
        b = s2[prop as keyof SpaceResource].toString() || ''
    }

    return desc
      ? b.localeCompare(a, undefined, { numeric })
      : a.localeCompare(b, undefined, { numeric })
  })
}
const items = computed(() =>
  orderBy(filter(unref(spaces), unref(filterTerm)), unref(sortBy), unref(sortDir) === SortDir.Desc)
)
const {
  items: paginatedItems,
  page: currentPage,
  total: totalPages
} = usePagination({ items, perPageDefault, perPageStoragePrefix })

const keyActions = useKeyboardActions()
useKeyboardTableNavigation(
  keyActions,
  paginatedItems,
  selectedSpaces,
  lastSelectedSpaceIndex,
  lastSelectedSpaceId
)
useKeyboardTableMouseActions(
  keyActions,
  paginatedItems,
  selectedSpaces,
  lastSelectedSpaceIndex,
  lastSelectedSpaceId
)

watch(currentPage, () => {
  unselectAllSpaces()
})

const allSpacesSelected = computed(() => {
  return unref(paginatedItems).length === unref(selectedSpaces).length
})

const handleSort = (event: { sortBy: string; sortDir: SortDir }) => {
  sortBy.value = event.sortBy
  sortDir.value = event.sortDir
}
const filter = (spaces: SpaceResource[], filterTerm: string) => {
  if (!(filterTerm || '').trim()) {
    return spaces
  }
  const searchEngine = new Fuse(spaces, { ...defaultFuseOptions, keys: ['name'] })
  return searchEngine.search(filterTerm).map((r) => r.item)
}
const isSpaceSelected = (space: SpaceResource) => {
  return unref(selectedSpaces).some((s) => s.id === space.id)
}

const fields = computed<FieldType[]>(() => [
  {
    name: 'select',
    title: '',
    type: 'slot',
    width: 'shrink',
    headerType: 'slot'
  },
  {
    name: 'icon',
    title: '',
    type: 'slot',
    width: 'shrink'
  },
  {
    name: 'name',
    title: $gettext('Name'),
    type: 'slot',
    sortable: true,
    tdClass: 'mark-element',
    width: 'expand'
  },
  {
    name: 'status',
    title: $gettext('Status'),
    type: 'slot',
    sortable: true
  },
  {
    name: 'manager',
    title: $gettext('Manager'),
    type: 'slot'
  },
  {
    name: 'members',
    title: $gettext('Members'),
    type: 'slot',
    sortable: true
  },
  {
    name: 'totalQuota',
    title: $gettext('Total quota'),
    type: 'slot',
    sortable: true
  },
  {
    name: 'usedQuota',
    title: $gettext('Used quota'),
    type: 'slot',
    sortable: true
  },
  {
    name: 'remainingQuota',
    title: $gettext('Remaining quota'),
    type: 'slot',
    sortable: true
  },
  {
    name: 'mdate',
    title: $gettext('Modified'),
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
])

const getManagerNames = (space: SpaceResource) => {
  const allManagers = getSpaceManagers(space, sharesStore.graphRoles)
  if (!allManagers?.length) {
    return '-'
  }
  const managers = allManagers.length > 2 ? allManagers.slice(0, 2) : allManagers
  let managerStr = managers
    .map(({ grantedToV2 }) => (grantedToV2.user || grantedToV2.group).displayName)
    .join(', ')
  if (allManagers.length > 2) {
    managerStr += `... +${allManagers.length - 2}`
  }
  return managerStr
}
const formatDate = (date: string) => {
  return formatDateFromJSDate(new Date(date), language.current)
}
const formatDateRelative = (date: string) => {
  return formatRelativeDateFromJSDate(new Date(date), language.current)
}
const getTotalQuota = (space: SpaceResource) => {
  if (space.spaceQuota.total === 0) {
    return $gettext('Unrestricted')
  }

  return formatFileSize(space.spaceQuota.total, language.current)
}
const getUsedQuota = (space: SpaceResource) => {
  if (space.spaceQuota.used === undefined) {
    return '-'
  }
  return formatFileSize(space.spaceQuota.used, language.current)
}
const getRemainingQuota = (space: SpaceResource) => {
  if (space.spaceQuota.total === 0) {
    return $gettext('Unrestricted')
  }
  if (space.spaceQuota.remaining === undefined) {
    return '-'
  }
  return formatFileSize(space.spaceQuota.remaining, language.current)
}
const getMemberCount = (space: SpaceResource) => {
  return space.root.permissions?.length || 1
}

const getSelectSpaceLabel = (space: SpaceResource) => {
  return $gettext('Select %{ space }', { space: space.name }, true)
}

onMounted(() => {
  nextTick(() => {
    markInstance.value = new Mark('.mark-element')
  })
})

watch(filterTerm, async () => {
  await unref(router).push({ ...unref(route), query: { ...unref(route).query, page: '1' } })
})

watch([filterTerm, paginatedItems], () => {
  unref(markInstance)?.unmark()
  unref(markInstance)?.mark(unref(filterTerm), {
    element: 'span',
    className: 'mark-highlight'
  })
})

const fileClicked = (data: [SpaceResource, MouseEvent]) => {
  const resource = data[0]
  const eventData = data[1]
  const isCheckboxClicked = (eventData?.target as HTMLElement).getAttribute('type') === 'checkbox'

  const contextActionClicked =
    (eventData?.target as HTMLElement)?.closest('div')?.id === 'oc-files-context-menu'
  if (contextActionClicked) {
    return
  }
  if (!eventData.shiftKey && !eventData.metaKey && !eventData.ctrlKey) {
    eventBus.publish('app.files.shiftAnchor.reset')
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

  unselectAllSpaces()
  selectSpace(resource)
}

const showContextMenuOnBtnClick = (data: ContextMenuBtnClickEventData, space: SpaceResource) => {
  const { dropdown, event } = data
  if (dropdown?.tippy === undefined) {
    return
  }
  if (!isSpaceSelected(space)) {
    spaceSettingsStore.setSelectedSpaces([space])
  }
  displayPositionedDropdown(dropdown.tippy, event, unref(contextMenuButtonRef))
}
const showContextMenuOnRightClick = (
  row: ComponentPublicInstance<unknown>,
  event: MouseEvent,
  space: SpaceResource
) => {
  event.preventDefault()
  const dropdown = row.$el.getElementsByClassName('spaces-table-btn-action-dropdown')[0]
  if (dropdown === undefined) {
    return
  }
  if (!isSpaceSelected(space)) {
    spaceSettingsStore.setSelectedSpaces([space])
  }
  displayPositionedDropdown(dropdown._tippy, event, unref(contextMenuButtonRef))
}

const spaceDetailsLabel = computed(() => {
  return $gettext('Show details')
})
const showDetailsForSpace = (space: SpaceResource) => {
  selectSpace(space)
  eventBus.publish(SideBarEventTopics.open)
}

const selectSpace = (selectedSpace: SpaceResource) => {
  lastSelectedSpaceIndex.value = findIndex(unref(spaces), (g) => g.id === selectedSpace.id)
  lastSelectedSpaceId.value = selectedSpace.id
  keyActions.resetSelectionCursor()

  const isSpaceSelected = unref(selectedSpaces).find((space) => space.id === selectedSpace.id)
  if (!isSpaceSelected) {
    return spaceSettingsStore.addSelectedSpace(selectedSpace)
  }

  spaceSettingsStore.setSelectedSpaces(
    unref(selectedSpaces).filter((space) => space.id !== selectedSpace.id)
  )
}

const unselectAllSpaces = () => {
  spaceSettingsStore.setSelectedSpaces([])
}

const selectSpaces = (spaces: SpaceResource[]) => {
  spaceSettingsStore.setSelectedSpaces(spaces)
}
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .settings-spaces-table .oc-table-header-cell-actions,
  .settings-spaces-table .oc-table-data-cell-actions {
    @apply whitespace-nowrap;
  }

  /* Status, Members, Mdate: hidden by default, visible from md */
  .oc-table-header-cell-status,
  .oc-table-data-cell-status,
  .oc-table-header-cell-members,
  .oc-table-data-cell-members,
  .oc-table-header-cell-mdate,
  .oc-table-data-cell-mdate {
    @apply hidden md:table-cell;
  }

  /* Manager, TotalQuota, UsedQuota, RemainingQuota: hidden by default, visible from lg */
  .settings-spaces-table .oc-table-header-cell-manager,
  .settings-spaces-table .oc-table-data-cell-manager,
  .settings-spaces-table .oc-table-header-cell-totalQuota,
  .settings-spaces-table .oc-table-data-cell-totalQuota,
  .settings-spaces-table .oc-table-header-cell-usedQuota,
  .settings-spaces-table .oc-table-data-cell-usedQuota,
  .settings-spaces-table .oc-table-header-cell-remainingQuota,
  .settings-spaces-table .oc-table-data-cell-remainingQuota {
    @apply hidden lg:table-cell;
  }

  /* Squashed variant */
  .settings-spaces-table-squashed .oc-table-header-cell-manager,
  .settings-spaces-table-squashed .oc-table-data-cell-manager,
  .settings-spaces-table-squashed .oc-table-header-cell-status,
  .settings-spaces-table-squashed .oc-table-data-cell-status,
  .settings-spaces-table-squashed .oc-table-header-cell-members,
  .settings-spaces-table-squashed .oc-table-data-cell-members,
  .settings-spaces-table-squashed .oc-table-header-cell-totalQuota,
  .settings-spaces-table-squashed .oc-table-data-cell-totalQuota,
  .settings-spaces-table-squashed .oc-table-header-cell-usedQuota,
  .settings-spaces-table-squashed .oc-table-data-cell-usedQuota {
    @apply hidden;
  }

  /* RemainingQuota, Status, Members, Mdate visible from xl */
  .settings-spaces-table-squashed .oc-table-header-cell-remainingQuota,
  .settings-spaces-table-squashed .oc-table-data-cell-remainingQuota,
  .settings-spaces-table-squashed .oc-table-header-cell-status,
  .settings-spaces-table-squashed .oc-table-data-cell-status,
  .settings-spaces-table-squashed .oc-table-header-cell-members,
  .settings-spaces-table-squashed .oc-table-data-cell-members,
  .settings-spaces-table-squashed .oc-table-header-cell-mdate,
  .settings-spaces-table-squashed .oc-table-data-cell-mdate {
    @apply hidden xl:table-cell;
  }
}
</style>
