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
          v-if="showOptionFilter && filterableAttributes.length"
          ref="filterInputRef"
          v-model="filterTerm"
          class="item-filter-input mb-4 mt-2"
          autocomplete="off"
          :label="optionFilterLabel === '' ? $gettext('Filter list') : optionFilterLabel"
        />
        <div ref="itemFilterListRef">
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
                    <slot name="image" :item="item" />
                  </div>
                  <div class="truncate">
                    <slot name="item" :item="item" />
                  </div>
                </div>
                <div class="flex">
                  <oc-icon v-if="!allowMultiple && isItemSelected(item)" name="check" />
                </div>
              </oc-button>
            </li>
          </oc-list>
        </div>
      </template>
    </oc-filter-chip>
  </div>
</template>

<script setup lang="ts">
import {
  ComponentPublicInstance,
  nextTick,
  onMounted,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import Fuse, { FuseOptionKey } from 'fuse.js'
import Mark from 'mark.js'
import omit from 'lodash-es/omit'
import { useRoute, useRouteQuery, useRouter } from '../composables'
import { defaultFuseOptions } from '../helpers'
import { queryItemAsString } from '../composables/appDefaults'
import { OcTextInput } from '@opencloud-eu/design-system/components'

type Item = Record<string, any>

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
  (e: 'selectionChange', selectedItems: Item[]): void
}>()

const router = useRouter()
const currentRoute = useRoute()
const filterInputRef = useTemplateRef<ComponentPublicInstance<typeof OcTextInput>>('filterInputRef')
const selectedItems = ref<Item[]>([])
const displayedItems = ref(items)
const itemFilterListRef = useTemplateRef('itemFilterListRef')

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

const setDisplayedItems = (items: Item[]) => {
  displayedItems.value = items
}

const showDrop = async () => {
  setDisplayedItems(items)
  await nextTick()
  unref(filterInputRef)?.focus()
}

let markInstance: Mark | undefined
watch(filterTerm, () => {
  setDisplayedItems(filter(items, unref(filterTerm)))
  if (unref(itemFilterListRef)) {
    markInstance = new Mark(unref(itemFilterListRef))
    markInstance.unmark()
    markInstance.mark(unref(filterTerm), {
      element: 'span',
      className: 'mark-highlight'
    })
  }
})

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
