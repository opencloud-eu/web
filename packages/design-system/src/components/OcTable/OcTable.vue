<template>
  <table v-bind="extractTableProps()" class="has-item-context-menu">
    <oc-thead v-if="hasHeader">
      <oc-tr class="oc-table-header-row h-10.5">
        <oc-th
          v-for="(field, index) in fields"
          :key="`oc-thead-${field.name}`"
          v-bind="extractThProps(field, index)"
        >
          <oc-button
            v-if="field.sortable"
            :aria-label="getSortLabel(field.name)"
            appearance="raw"
            justify-content="left"
            class="oc-button-sort w-full hover:underline"
            gap-size="small"
            no-hover
            @click="handleSort(field)"
          >
            <span
              v-if="field.headerType === 'slot'"
              class="oc-table-thead-content inline-table align-middle"
            >
              <slot :name="field.name + 'Header'" />
            </span>
            <span
              v-else
              class="oc-table-thead-content inline-table align-middle header-text"
              v-text="extractFieldTitle(field)"
            />
            <oc-icon
              :name="sortDir === 'asc' ? 'arrow-down' : 'arrow-up'"
              fill-type="line"
              :class="{ 'sr-only': sortBy !== field.name }"
              class="p-1 rounded-sm"
              size-class="size-4"
            />
          </oc-button>
          <div v-else>
            <span
              v-if="field.headerType === 'slot'"
              class="oc-table-thead-content inline-table align-middle"
            >
              <slot :name="field.name + 'Header'" />
            </span>
            <span
              v-else
              class="oc-table-thead-content inline-table align-middle header-text"
              v-text="extractFieldTitle(field)"
            />
          </div>
        </oc-th>
      </oc-tr>
    </oc-thead>
    <oc-tbody class="has-item-context-menu">
      <oc-table-row
        v-for="(item, trIndex) in data"
        :key="`oc-tbody-tr-${domSelector(item) || trIndex}`"
        :ref="`row-${trIndex}`"
        :item="item"
        :fields="fields"
        :id-key="idKey"
        :dom-selector="domSelector(item) || trIndex"
        :padding-x="paddingX"
        :lazy="lazy"
        :drag-drop="dragDrop"
        :is-highlighted="isHighlighted ?? defaultIsHighlighted"
        :is-disabled="isDisabled ?? defaultIsDisabled"
        @click="$emit(constants.EVENT_TROW_CLICKED, [item, $event])"
        @contextmenu="
          $emit(
            constants.EVENT_TROW_CONTEXTMENU,
            ($refs[`row-${trIndex}`] as ComponentPublicInstance<unknown>[])[0],
            $event,
            item
          )
        "
        @dragstart="dragStart(item, $event)"
        @drop="dropRowEvent(item, $event)"
        @dragenter="dropRowStyling(item, false, $event)"
        @dragleave="dropRowStyling(item, true, $event)"
        @item-visible="$emit('itemVisible', item)"
      >
        <template v-for="(_, name) in $slots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps" />
        </template>
      </oc-table-row>
    </oc-tbody>
    <tfoot v-if="$slots.footer" class="oc-table-footer border-t">
      <tr class="oc-table-footer-row h-10.5">
        <td
          :colspan="fullColspan"
          class="oc-table-footer-cell p-1 text-sm text-role-on-surface-variant"
        >
          <!-- @slot Footer of the table -->
          <slot name="footer" />
        </td>
      </tr>
    </tfoot>
  </table>
</template>

<script setup lang="ts">
import { ComponentPublicInstance, computed } from 'vue'
import OcThead from '../OcTableHead/OcTableHead.vue'
import OcTbody from '../OcTableBody/OcTableBody.vue'
import OcTr from '../OcTableTr/OcTableTr.vue'
import OcTh from '../OcTableTh/OcTableTh.vue'
import OcTableRow from '../OcTableRow/OcTableRow.vue'
import OcButton from '../OcButton/OcButton.vue'
import {
  Item as BaseItem,
  FieldType,
  SizeType,
  SortDir,
  extractCellProps,
  getTailwindXPadding
} from '../../helpers'
import {
  EVENT_THEAD_CLICKED,
  EVENT_TROW_CLICKED,
  EVENT_TROW_CONTEXTMENU,
  EVENT_ITEM_DROPPED,
  EVENT_ITEM_DRAGGED
} from '../../helpers/constants'
import { useGettext } from 'vue3-gettext'

type Item = BaseItem & any

export interface Props {
  /**
   * @docs The data to be displayed in the table.
   */
  data: Item[]
  /**
   * @docs The fields to be displayed as table headers.
   */
  fields: FieldType[]
  /**
   * @docs The IDs of the rows that should be disabled.
   */
  disabled?: Array<string | number>
  /**
   * @docs Determines if the table supports dragging and dropping items onto rows.
   * @default false
   */
  dragDrop?: boolean
  /**
   * @docs Determines if the table has a header row.
   * @default true
   */
  hasHeader?: boolean
  /**
   * @docs The position of the sticky header.
   * @default 0
   */
  headerPosition?: number
  /**
   * @docs The IDs of the rows that should be highlighted.
   */
  highlighted?: string[]
  /**
   * @docs Optional resolver to decide per row whether it should be highlighted.
   * When provided it takes precedence over `highlighted`. It's recommended to
   * use this over `highlighted` for larger data sets (> 100 rows) because it
   * ensures that only the affected rows re-render instead of the entire table.
   */
  isHighlighted?: (item: Item) => boolean
  /**
   * @docs Optional resolver to decide per row whether it should be disabled.
   * When provided it takes precedence over `disabled`. See `isHighlighted` for
   * more details on when to use it.
   */
  isDisabled?: (item: Item) => boolean
  /**
   * @docs Determines if the table rows should have a hover effect.
   * @default false
   */
  hover?: boolean
  /**
   * @docs The key to be used as the unique identifier for each row.
   * @default 'id'
   */
  idKey?: string
  /**
   * @docs A function to get the dom selector for each item.
   */
  itemDomSelector?: (item: Item) => string
  /**
   * @docs Determines if the table should be lazy loaded.
   * @default false
   */
  lazy?: boolean
  /**
   * @docs The horizontal padding size of the table.
   * @default small
   */
  paddingX?: SizeType | 'remove'
  /**
   * @docs The default field to sort by.
   */
  sortBy?: string
  /**
   * @docs The default sort direction.
   */
  sortDir?: SortDir
  /**
   * @docs Determines if the table header should be sticky. This is helpful when it should still be visible when scrolling.
   * @default false
   */
  sticky?: boolean
}

export interface Emits {
  /**
   * @docs Emitted when an item has been dropped onto a row.
   */
  (e: 'itemDropped', args: [Item, DragEvent]): void

  /**
   * @docs Emitted when an item has been dragged onto a row.
   */
  (e: 'itemDragged', args: [Item, DragEvent]): void

  /**
   * @docs Emitted when a table header has been clicked.
   */
  (e: 'theadClicked', event: MouseEvent): void

  /**
   * @docs Emitted when a table row has been clicked.
   */
  (e: 'highlight', args: [Item, MouseEvent]): void

  /**
   * @docs Emitted when a table row has been right-clicked.
   */
  (
    e: 'contextmenuClicked',
    element: ComponentPublicInstance<unknown>,
    event: MouseEvent,
    item: Item
  ): void

  /**
   * @docs Emitted when a column has been sorted.
   */
  (e: 'sort', sort: { sortBy: string; sortDir: SortDir }): void

  /**
   * @docs Emitted when an element has entered a drop zone inside the table.
   */
  (e: 'dropRowStyling', item: Item, leaving: boolean, event: DragEvent): void

  /**
   * @docs Emitted when an item has been scrolled into the view.
   */
  (e: 'itemVisible', item: Item): void
}

export interface Slots {
  /**
   * @slot The footer of the table.
   */
  footer?: () => unknown
  /**
   * @docs Each field can have it's own slot.
   */
  [dynamicSlot: string]: any
}

const {
  data,
  fields,
  disabled = [],
  dragDrop = false,
  hasHeader = true,
  headerPosition = 0,
  highlighted = undefined,
  isHighlighted = undefined,
  isDisabled = undefined,
  hover = false,
  idKey = 'id',
  itemDomSelector,
  lazy = false,
  paddingX = 'small',
  sortBy,
  sortDir,
  sticky = false
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const constants = {
  EVENT_THEAD_CLICKED,
  EVENT_TROW_CLICKED,
  EVENT_TROW_CONTEXTMENU
}

const { $gettext } = useGettext()

const domSelector = (item: Item) => {
  if (itemDomSelector) {
    return itemDomSelector(item)
  }
  return item[idKey as keyof Item]
}

const tableClasses = computed(() => {
  const result = ['oc-table']

  if (hover) {
    result.push('oc-table-hover')
  }

  if (sticky) {
    result.push('oc-table-sticky')
  }

  return result
})

const fullColspan = computed(() => {
  return fields.length
})

const dragStart = (item: Item, event: DragEvent) => {
  emit(EVENT_ITEM_DRAGGED, [item, event])
}

const dropRowEvent = (item: Item, event: DragEvent) => {
  emit(EVENT_ITEM_DROPPED, [item, event])
}

const dropRowStyling = (item: Item, leaving: boolean, event: DragEvent) => {
  emit('dropRowStyling', item, leaving, event)
}

const extractFieldTitle = (field: FieldType) => {
  if (Object.prototype.hasOwnProperty.call(field, 'title')) {
    return field.title
  }
  return field.name
}

const extractTableProps = () => {
  return {
    class: tableClasses.value
  }
}

const extractThProps = (field: FieldType, index: number) => {
  const props = extractCellProps(field)
  props.class = `oc-table-header-cell oc-table-header-cell-${field.name}`
  if (Object.prototype.hasOwnProperty.call(field, 'thClass')) {
    props.class += ` ${field.thClass}`
  }
  if (sticky) {
    props.style = `top: ${headerPosition}px;`
    props.class += ' z-10'
  }

  if (index === 0) {
    props.class += ` ${getTailwindXPadding(paddingX, 'left')} `
  }

  if (index === fields.length - 1) {
    props.class += ` ${getTailwindXPadding(paddingX, 'right')}`
  }

  extractSortThProps(props, field)

  return props
}

const highlightedSet = computed(() => new Set(highlighted))

const disabledSet = computed(() => new Set(disabled))

// Stable default resolvers used when no `isHighlighted`/`isDisabled` prop is
// passed. Their references never change, so the table's own render only reads
// the (stable) function - the reactive Set lookup happens inside each row,
// isolating re-renders to the rows instead of re-rendering the entire table.
const defaultIsHighlighted = (item: Item) => {
  return highlightedSet.value.has(item[idKey as keyof Item])
}

const defaultIsDisabled = (item: Item) => {
  return disabledSet.value.has(item[idKey as keyof Item])
}

const getSortLabel = (name: string) => {
  return $gettext('Sort by %{ name }', { name })
}

const extractSortThProps = (props: Record<string, string>, field: FieldType) => {
  if (!fieldIsSortable(field)) {
    return
  }

  let sort = 'none'
  if (sortBy === field.name) {
    sort = sortDir === SortDir.Asc ? 'ascending' : 'descending'
  }
  props['aria-sort'] = sort
}

const fieldIsSortable = ({ sortable }: FieldType) => {
  return !!sortable
}

const handleSort = (field: FieldType) => {
  if (!fieldIsSortable(field)) {
    return
  }

  let sortDirection = sortDir
  // toggle sortDir if already sorted by this column
  if (sortBy === field.name && sortDir !== undefined) {
    sortDirection = sortDir === SortDir.Desc ? SortDir.Asc : SortDir.Desc
  }
  // set default sortDir of the field when sortDir not set or sortBy changed
  if (sortBy !== field.name || sortDir === undefined) {
    sortDirection = (field.sortDir || SortDir.Desc) as SortDir
  }

  emit('sort', {
    sortBy: field.name,
    sortDir: sortDirection
  })
}
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-table {
    @apply w-full;
  }
  .oc-table-hover tr {
    @apply transition-colors duration-200 ease-in-out;
  }
  .item-accentuated,
  .oc-table-highlighted,
  .oc-table .highlightedDropTarget {
    @apply bg-role-secondary-container;
  }
  .oc-table-sticky {
    @apply relative;
  }
  .oc-table-sticky .oc-table-header-cell {
    @apply bg-role-surface sticky z-10;
  }
  .oc-table-hover tr:not(.oc-table-footer-row, .oc-table-header-row, .oc-table-highlighted):hover,
  .oc-button-sort .oc-icon:hover {
    @apply bg-role-surface-container;
  }
}
</style>
