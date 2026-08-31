<template>
  <div class="item-filter flex" :class="`item-filter-${filterName}`">
    <oc-filter-chip
      :filter-label="filterLabel"
      :selected-item-names="selectedItems.map((i) => i[displayNameAttribute])"
      :close-on-click="closeOnClick"
      @clear-filter="clearFilter"
      @show-drop="showDrop"
    >
      <template #default>
        <oc-text-input
          v-if="canFilterOptions"
          ref="filterInputRef"
          v-model="filterTerm"
          class="item-filter-input mb-4 mt-2"
          autocomplete="off"
          :label="optionFilterLabel === '' ? $gettext('Filter list') : optionFilterLabel"
        />
        <oc-list class="item-filter-list">
          <li v-for="(item, index) in displayedItems" :key="index" class="my-1">
            <oc-button
              class="item-filter-list-item flex items-center w-full"
              :class="{
                'item-filter-list-item-active': !allowMultiple && isItemSelected(item),
                'justify-start': allowMultiple,
                'justify-between': !allowMultiple
              }"
              justify-content="space-between"
              appearance="raw"
              :data-test-value="item[displayNameAttribute as keyof Item]"
              @click="toggleItemSelection(item)"
            >
              <div class="flex items-center truncate">
                <oc-checkbox
                  v-if="allowMultiple"
                  size="large"
                  class="mr-2"
                  :label="$gettext('Toggle selection')"
                  :model-value="isItemSelected(item)"
                  :label-hidden="true"
                  @update:model-value="toggleItemSelection(item)"
                  @click.stop
                />
                <div>
                  <slot name="image" :item="item" :term="filterTerm || ''" />
                </div>
                <div class="truncate">
                  <slot name="item" :item="item" :term="filterTerm || ''" />
                </div>
              </div>
              <div class="flex">
                <oc-icon v-if="!allowMultiple && isItemSelected(item)" name="check" />
              </div>
            </oc-button>
          </li>
        </oc-list>
        <p
          v-if="hiddenItemCount"
          class="item-filter-truncation-hint text-sm text-role-on-surface-variant mt-2 mb-0"
          v-text="truncationHint"
        />
      </template>
    </oc-filter-chip>
  </div>
</template>

<script setup lang="ts">
import {
  ComponentPublicInstance,
  computed,
  nextTick,
  onMounted,
  ref,
  unref,
  useTemplateRef
} from 'vue'
import Fuse, { FuseOptionKey } from 'fuse.js'
import omit from 'lodash-es/omit'
import { useRoute, useRouteQuery, useRouter } from '../composables'
import { defaultFuseOptions } from '../helpers'
import { queryItemAsString } from '../composables/appDefaults'
import { OcTextInput } from '@opencloud-eu/design-system/components'
import { useGettext } from 'vue3-gettext'

type Item = Record<string, any>

/**
 * Long lists are truncated because rendering them all is expensive and unusable.
 * Only applies if the option filter is available, otherwise the hidden items would be unreachable.
 */
const maxDisplayedItems = 20

const {
  filterLabel,
  filterName,
  items,
  optionFilterLabel = '',
  showOptionFilter = false,
  allowMultiple = false,
  idAttribute = 'id',
  displayNameAttribute = 'name',
  filterableAttributes = [],
  closeOnClick = false
} = defineProps<{
  filterLabel: string
  filterName: string
  items: Item[]
  optionFilterLabel?: string
  showOptionFilter?: boolean
  allowMultiple?: boolean
  idAttribute?: string
  displayNameAttribute?: string
  filterableAttributes?: FuseOptionKey<Item>[]
  closeOnClick?: boolean
}>()

const emit = defineEmits<{
  (e: 'selectionChange', selectedItems: any[]): void
}>()

defineSlots<{
  image?: (props: { item: Item; term: string }) => unknown
  item?: (props: { item: Item; term: string }) => unknown
}>()

const { $ngettext } = useGettext()
const router = useRouter()
const currentRoute = useRoute()
const filterInputRef = useTemplateRef<ComponentPublicInstance<typeof OcTextInput>>('filterInputRef')
const selectedItems = ref<Item[]>([])

const queryParam = `q_${filterName}`
const currentRouteQuery = useRouteQuery(queryParam)

const getId = (item: Item) => {
  return item[idAttribute as keyof Item]
}

const setRouteQuery = () => {
  return router.push({
    query: {
      ...omit(unref(currentRoute).query, [queryParam]),
      ...(!!unref(selectedItems).length && {
        [queryParam]: unref(selectedItems)
          .reduce<string>((acc, item) => {
            acc += `${getId(item)}+`
            return acc
          }, '')
          .slice(0, -1)
      })
    }
  })
}

const isItemSelected = (item: Item) => {
  return !!unref(selectedItems).find((s) => getId(s) === getId(item))
}

const toggleItemSelection = async (item: Item) => {
  if (isItemSelected(item)) {
    selectedItems.value = unref(selectedItems).filter((s) => getId(s) !== getId(item))
  } else {
    if (!allowMultiple) {
      selectedItems.value = []
    }
    selectedItems.value.push(item)
  }
  await setRouteQuery()
  emit('selectionChange', unref(selectedItems))
}

const filterTerm = ref<string>()
const filter = (items: Item[], filterTerm: string) => {
  if (!(filterTerm || '').trim()) {
    return items
  }
  const fuse = new Fuse(items, {
    ...defaultFuseOptions,
    keys: filterableAttributes
  })

  const results = fuse.search(filterTerm).map((r) => r.item)
  return items.filter((item) => results.includes(item))
}
const clearFilter = () => {
  selectedItems.value = []
  emit('selectionChange', unref(selectedItems))
  setRouteQuery()
}

const canFilterOptions = computed(() => showOptionFilter && !!filterableAttributes.length)
const filteredItems = computed(() => filter(items, unref(filterTerm)))
const displayedItems = computed(() => {
  const filtered = unref(filteredItems)
  if (!unref(canFilterOptions) || filtered.length <= maxDisplayedItems) {
    return filtered
  }

  // selected items are always displayed, they could not be de-selected otherwise
  return [
    ...filtered.slice(0, maxDisplayedItems),
    ...filtered.slice(maxDisplayedItems).filter(isItemSelected)
  ]
})
const hiddenItemCount = computed(() => unref(filteredItems).length - unref(displayedItems).length)
const truncationHint = computed(() => {
  const count = unref(hiddenItemCount)
  return $ngettext(
    '%{ count } more item is not shown. Use the filter to narrow down the list.',
    '%{ count } more items are not shown. Use the filter to narrow down the list.',
    count,
    { count: count.toString() }
  )
})

const showDrop = async () => {
  filterTerm.value = undefined
  await nextTick()
  unref(filterInputRef)?.focus()
}

const setSelectedItemsBasedOnQuery = () => {
  const queryStr = queryItemAsString(unref(currentRouteQuery))
  if (queryStr) {
    const ids = queryStr.split('+')
    selectedItems.value = items.filter((s) => ids.includes(getId(s)))
  }
}

defineExpose({ setSelectedItemsBasedOnQuery })

onMounted(() => {
  setSelectedItemsBasedOnQuery()
})
</script>
