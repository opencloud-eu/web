<template>
  <div
    class="date-filter flex overflow-hidden [&_label]:text-sm"
    :class="`date-filter-${filterName}`"
  >
    <oc-filter-chip
      ref="filterChip"
      :filter-label="filterLabel"
      :selected-item-names="selectedItem ? [selectedItem[displayNameAttribute]] : undefined"
      @clear-filter="clearFilter"
      @show-drop="onShowDrop"
      @hide-drop="onHideDrop"
    >
      <template #default>
        <oc-list
          :class="{
            'invisible min-h-[225px] transition-[visibility] duration-[0.4s,0s]': dateRangeClicked
          }"
        >
          <li
            v-for="(item, index) in displayedItems"
            :key="index"
            class="my-1 first:mt-0 last:mb-0"
          >
            <oc-button
              class="date-filter-list-item flex justify-between items-center w-full p-1"
              :class="{
                'date-filter-list-item-active': isItemSelected(item)
              }"
              justify-content="space-between"
              appearance="raw"
              :data-testid="item[displayNameAttribute as keyof Item]"
              @click="toggleItemSelection(item)"
            >
              <div class="flex items-center truncate">
                <div class="truncate ml-2">
                  <slot name="item" :item="item" />
                </div>
              </div>
              <div class="flex">
                <oc-icon v-if="isItemSelected(item)" name="check" />
              </div>
            </oc-button>
          </li>
          <li class="my-1">
            <oc-button
              class="date-filter-list-item flex justify-between items-center w-full p-1"
              :class="{
                'date-filter-list-item-active': dateRangeApplied
              }"
              justify-content="space-between"
              appearance="raw"
              data-testid="custom-date-range"
              @click="dateRangeClicked = true"
            >
              <div class="flex items-center truncate">
                <div class="truncate ml-2">
                  <span v-text="$gettext('Custom date range')" />
                </div>
              </div>
              <div class="flex">
                <oc-icon v-if="dateRangeApplied" name="check" />
              </div>
            </oc-button>
          </li>
        </oc-list>
        <div
          class="date-filter-range-panel absolute top-0 p-2 bg-role-surface"
          :class="{
            'transform-[translateX(0)] visible': dateRangeClicked,
            'transform-[translateX(100%)] invisible': !dateRangeClicked
          }"
        >
          <div class="flex items-center justify-between mb-4">
            <oc-button
              appearance="raw"
              class="date-filter-range-panel-back"
              :aria-label="$gettext('Go back to filter options')"
              @click="dateRangeClicked = false"
            >
              <oc-icon name="arrow-left-s" fill-type="line" />
            </oc-button>
            <span v-text="$gettext('Custom date range')" />
            <oc-button
              appearance="raw"
              class="date-filter-range-panel-close"
              :aria-label="$gettext('Close filter')"
              @click="filterChip.hideDrop()"
            >
              <oc-icon name="close" />
            </oc-button>
          </div>
          <div class="mt-2">
            <oc-datepicker
              :label="$gettext('From')"
              :is-clearable="true"
              :current-date="fromDate"
              :is-dark="currentTheme.isDark"
              @date-changed="(value) => setDateRangeDate(value, 'from')"
            />
            <oc-datepicker
              :label="$gettext('To')"
              :is-clearable="true"
              :current-date="toDate"
              :min-date="fromDate ? fromDate : undefined"
              :is-dark="currentTheme.isDark"
              @date-changed="(value) => setDateRangeDate(value, 'to')"
            />
          </div>
          <div class="date-filter-apply-btn text-end">
            <oc-button size="small" :disabled="!dateRangeValid" @click="applyDateRangeFilter">
              {{ $gettext('Apply') }}
            </oc-button>
          </div>
        </div>
      </template>
    </oc-filter-chip>
  </div>
</template>

<script lang="ts">
import { PropType, computed, defineComponent, onMounted, ref, unref } from 'vue'
import omit from 'lodash-es/omit'
import { useRoute, useRouteQuery, useRouter, useThemeStore } from '../../composables'
import { formatDateFromDateTime } from '../../helpers'
import { queryItemAsString } from '../../composables/appDefaults'
import { DateTime } from 'luxon'
import { useGettext } from 'vue3-gettext'
import { OcFilterChip } from '@opencloud-eu/design-system/components'
import { storeToRefs } from 'pinia'

type Item = Record<string, string>

export default defineComponent({
  name: 'DateFilter',
  props: {
    filterLabel: {
      type: String,
      required: true
    },
    filterName: {
      type: String,
      required: true
    },
    items: {
      type: Array as PropType<Item[]>,
      required: true
    },
    idAttribute: {
      type: String,
      required: false,
      default: 'id'
    },
    displayNameAttribute: {
      type: String,
      required: false,
      default: 'name'
    }
  },
  emits: ['selectionChange'],
  setup: function (props, { emit, expose }) {
    const router = useRouter()
    const { current: currentLanguage } = useGettext()
    const currentRoute = useRoute()
    const themeStore = useThemeStore()
    const { currentTheme } = storeToRefs(themeStore)
    const selectedItem = ref<Item>()
    const displayedItems = ref(props.items)
    const fromDate = ref<DateTime>()
    const toDate = ref<DateTime>()
    const dateRangeClicked = ref(false)
    const filterChip = ref<typeof OcFilterChip>()

    const queryParam = `q_${props.filterName}`
    const currentRouteQuery = useRouteQuery(queryParam)

    const getId = (item: Item) => {
      return item[props.idAttribute as keyof Item]
    }

    const setRouteQuery = () => {
      return router.push({
        query: {
          ...omit(unref(currentRoute).query, [queryParam]),
          ...(unref(selectedItem) && {
            [queryParam]: getId(unref(selectedItem))
          })
        }
      })
    }

    const isItemSelected = (item: Item) => {
      return unref(selectedItem) && getId(unref(selectedItem)) === getId(item)
    }

    const resetDateRange = () => {
      fromDate.value = undefined
      toDate.value = undefined
    }

    const toggleItemSelection = async (item: Item) => {
      resetDateRange()
      if (isItemSelected(item)) {
        selectedItem.value = undefined
      } else {
        selectedItem.value = item
        unref(filterChip).hideDrop()
      }
      await setRouteQuery()
      emit('selectionChange', unref(selectedItem))
    }

    const clearFilter = () => {
      selectedItem.value = undefined
      dateRangeClicked.value = false
      resetDateRange()
      emit('selectionChange', unref(selectedItem))
      setRouteQuery()
    }

    const onShowDrop = () => {
      displayedItems.value = props.items
    }

    const onHideDrop = () => {
      dateRangeClicked.value = false
    }

    const setSelectedItemsBasedOnQuery = () => {
      const id = queryItemAsString(unref(currentRouteQuery))
      if (!id) {
        return
      }

      const selected = props.items.find((s) => getId(s) === id)
      if (selected) {
        selectedItem.value = selected
        return
      }

      if (unref(dateRangeApplied)) {
        const dateRange = id.replace('range:', '')
        const from = Number(dateRange.split(' - ')[0])
        const to = Number(dateRange.split(' - ')[1])
        fromDate.value = DateTime.fromMillis(from)
        toDate.value = DateTime.fromMillis(to)
        selectedItem.value = unref(dateRangeOption)
      }
    }

    const dateRangeApplied = computed(() =>
      queryItemAsString(unref(currentRouteQuery))?.startsWith('range:')
    )

    const dateRangeValid = computed(() => {
      if (!unref(fromDate) || !unref(toDate)) {
        return false
      }
      return unref(fromDate) <= unref(toDate)
    })

    const dateRangeOption = computed(() => {
      if (!unref(fromDate) || !unref(toDate)) {
        return null
      }

      const from = formatDateFromDateTime(unref(fromDate), currentLanguage, DateTime.DATE_SHORT)
      const to = formatDateFromDateTime(unref(toDate), currentLanguage, DateTime.DATE_SHORT)
      const fromDateMillis = unref(fromDate).toMillis()
      const toDateMillis = unref(toDate).toMillis()

      return {
        [props.idAttribute]: `range:${fromDateMillis} - ${toDateMillis}`,
        [props.displayNameAttribute]: `${from} - ${to}`
      }
    })

    const applyDateRangeFilter = async () => {
      selectedItem.value = unref(dateRangeOption)
      await setRouteQuery()
      unref(filterChip).hideDrop()
      emit('selectionChange', unref(selectedItem))
    }

    const setDateRangeDate = (
      { date, error }: { date: DateTime; error: boolean },
      type: 'from' | 'to'
    ) => {
      if (error) {
        console.error('date could not be set')
        return
      }

      const prop = type === 'from' ? fromDate : toDate

      if (!date) {
        prop.value = undefined
        return
      }

      const formattedDate = type === 'from' ? date.startOf('day') : date.endOf('day')
      prop.value = formattedDate
    }

    expose({ setSelectedItemsBasedOnQuery })

    onMounted(() => {
      setSelectedItemsBasedOnQuery()
    })

    return {
      clearFilter,
      displayedItems,
      isItemSelected,
      selectedItem,
      onShowDrop,
      onHideDrop,
      filterChip,
      toggleItemSelection,
      setSelectedItemsBasedOnQuery,
      fromDate,
      toDate,
      dateRangeValid,
      applyDateRangeFilter,
      dateRangeApplied,
      setDateRangeDate,
      dateRangeClicked,
      currentTheme,

      // for unit tests
      queryParam
    }
  }
})
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .date-filter-range-panel {
    transition:
      transform 0.4s ease,
      visibility 0.4s 0s;
  }
}
</style>
