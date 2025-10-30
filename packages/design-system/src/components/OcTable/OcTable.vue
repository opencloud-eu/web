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
              size="small"
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
      <oc-tr
        v-for="(item, trIndex) in data"
        :key="`oc-tbody-tr-${domSelector(item) || trIndex}`"
        :ref="`row-${trIndex}`"
        v-bind="extractTbodyTrProps(item, trIndex)"
        :data-item-id="item[idKey as keyof Item]"
        :draggable="dragDrop"
        class="border-t h-10.5"
        @click="$emit(constants.EVENT_TROW_CLICKED, [item, $event])"
        @contextmenu="
          $emit(
            constants.EVENT_TROW_CONTEXTMENU,
            ($refs[`row-${trIndex}`] as ComponentPublicInstance<unknown>[])[0],
            $event,
            item
          )
        "
        @vue:mounted="
          $emit(
            constants.EVENT_TROW_MOUNTED,
            item,
            ($refs[`row-${trIndex}`] as Array<typeof OcTr>)[0]
          )
        "
        @dragstart="dragStart(item, $event)"
        @drop="dropRowEvent(domSelector(item), $event)"
        @dragenter.prevent="dropRowStyling(domSelector(item), false, $event)"
        @dragleave.prevent="dropRowStyling(domSelector(item), true, $event)"
        @mouseleave="dropRowStyling(domSelector(item), true, $event)"
        @dragover="dragOver($event)"
        @item-visible="$emit('itemVisible', item)"
      >
        <oc-td
          v-for="(field, tdIndex) in fields"
          :key="'oc-tbody-td-' + cellKey(field, tdIndex, item)"
          v-bind="extractTdProps(field, tdIndex, item)"
        >
          <slot v-if="isFieldTypeSlot(field)" :name="field.name" :item="item" />
          <template v-else-if="isFieldTypeCallback(field)">
            {{ field.callback(item[field.name as keyof Item]) }}
          </template>
          <template v-else>
            {{ item[field.name as keyof Item] }}
          </template>
        </oc-td>
      </oc-tr>
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
import OcTd from '../OcTableTd/OcTableTd.vue'
import OcButton from '../OcButton/OcButton.vue'
import { Item as BaseItem, FieldType, SizeType } from '../../helpers'
import {
  EVENT_THEAD_CLICKED,
  EVENT_TROW_CLICKED,
  EVENT_TROW_MOUNTED,
  EVENT_TROW_CONTEXTMENU,
  EVENT_ITEM_DROPPED,
  EVENT_ITEM_DRAGGED
} from '../../helpers/constants'
import { useGettext } from 'vue3-gettext'

const SORT_DIRECTION_ASC = 'asc' as const
const SORT_DIRECTION_DESC = 'desc' as const

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
  highlighted?: string | string[]
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
  sortDir?: 'asc' | 'desc'
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
  (e: 'itemDropped', selector: string, event: DragEvent): void

  /**
   * @docs Emitted when an item has been dragged onto a row.
   */
  (e: 'itemDragged', item: Item, event: DragEvent): void

  /**
   * @docs Emitted when a table header has been clicked.
   */
  (e: 'theadClicked', event: MouseEvent): void

  /**
   * @docs Emitted when a table row has been clicked.
   */
  (e: 'highlight', args: [Item, MouseEvent]): void

  /**
   * @docs Emitted when a table row has been mounted.
   */
  (e: 'rowMounted', item: Item, element: typeof OcTr): void

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
  (e: 'sort', sort: { sortBy: string; sortDir: 'asc' | 'desc' }): void

  /**
   * @docs Emitted when an element has entered a drop zone inside the table.
   */
  (e: 'dropRowStyling', selector: string, leaving: boolean, event: DragEvent): void

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
  [dynamicSlot: string]: () => unknown
}

const {
  data,
  fields,
  disabled = [],
  dragDrop = false,
  hasHeader = true,
  headerPosition = 0,
  highlighted,
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
  EVENT_TROW_MOUNTED,
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

const dragOver = (event: DragEvent) => {
  event.preventDefault()
}

const dragStart = (item: Item, event: DragEvent) => {
  emit(EVENT_ITEM_DRAGGED, item, event)
}

const dropRowEvent = (selector: string, event: DragEvent) => {
  emit(EVENT_ITEM_DROPPED, selector, event)
}

const dropRowStyling = (selector: string, leaving: boolean, event: DragEvent) => {
  emit('dropRowStyling', selector, leaving, event)
}

const isFieldTypeSlot = (field: FieldType) => {
  return field.type === 'slot'
}

const isFieldTypeCallback = (field: FieldType) => {
  return ['callback', 'function'].indexOf(field.type) >= 0
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

const getTailwindXPadding = (side: 'right' | 'left') => {
  // we can't interpolate tailwind classes, they might be missing in the bundle then
  switch (paddingX) {
    case 'remove':
      return side === 'right' ? 'pr-0' : 'pl-0'
    case 'xsmall':
      return side === 'right' ? 'pr-1' : 'pl-1'
    case 'small':
      return side === 'right' ? 'pr-2' : 'pl-2'
    case 'medium':
      return side === 'right' ? 'pr-4' : 'pl-4'
    case 'large':
      return side === 'right' ? 'pr-6' : 'pl-6'
    case 'xlarge':
      return side === 'right' ? 'pr-12' : 'pl-12'
    case 'xxlarge':
      return side === 'right' ? 'pr-24' : 'pl-24'
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
    props.class += ` ${getTailwindXPadding('left')} `
  }

  if (index === fields.length - 1) {
    props.class += ` ${getTailwindXPadding('right')}`
  }

  extractSortThProps(props, field)

  return props
}

const extractTbodyTrProps = (item: Item, index: number) => {
  return {
    ...(lazy && { lazy: { colspan: fullColspan.value } }),
    class: [
      'oc-tbody-tr',
      `oc-tbody-tr-${domSelector(item) || index}`,
      isHighlighted(item) ? 'oc-table-highlighted' : undefined,
      ...(isDisabled(item)
        ? ['oc-table-disabled', 'opacity-70', 'pointer-events-none', 'grayscale-60']
        : [])
    ].filter(Boolean)
  }
}

const extractTdProps = (field: FieldType, index: number, item: Item) => {
  const props = extractCellProps(field)
  props.class = `oc-table-data-cell oc-table-data-cell-${field.name}`
  if (Object.prototype.hasOwnProperty.call(field, 'tdClass')) {
    props.class += ` ${field.tdClass}`
  }
  if (Object.prototype.hasOwnProperty.call(field, 'wrap')) {
    props.wrap = field.wrap
  }

  if (index === 0) {
    props.class += ` ${getTailwindXPadding('left')} `
  }

  if (index === fields.length - 1) {
    props.class += ` ${getTailwindXPadding('right')}`
  }

  if (Object.prototype.hasOwnProperty.call(field, 'accessibleLabelCallback')) {
    props['aria-label'] = field.accessibleLabelCallback(item)
  }

  return props
}

const extractCellProps = (field: FieldType): Record<string, string> => {
  return {
    ...(field?.alignH && { alignH: field.alignH }),
    ...(field?.alignV && { alignV: field.alignV }),
    ...(field?.width && { width: field.width }),
    class: undefined,
    wrap: undefined,
    style: undefined
  }
}

const isHighlighted = (item: Item) => {
  if (!highlighted) {
    return false
  }

  if (Array.isArray(highlighted)) {
    return highlighted.indexOf(item[idKey as keyof Item]) > -1
  }

  return highlighted === item[idKey as keyof Item]
}

const isDisabled = (item: Item) => {
  if (!disabled.length) {
    return false
  }

  return disabled.indexOf(item[idKey as keyof Item]) > -1
}

const cellKey = (field: FieldType, index: number, item: Item) => {
  const prefix = [item[idKey as keyof Item], index + 1].filter(Boolean)

  if (isFieldTypeSlot(field)) {
    return [...prefix, field.name].join('-')
  }

  if (isFieldTypeCallback(field)) {
    return [...prefix, field.callback(item[field.name as keyof Item])].join('-')
  }

  return [...prefix, item[field.name as keyof Item]].join('-')
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
    sort = sortDir === SORT_DIRECTION_ASC ? 'ascending' : 'descending'
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
    sortDirection = sortDir === SORT_DIRECTION_DESC ? SORT_DIRECTION_ASC : SORT_DIRECTION_DESC
  }
  // set default sortDir of the field when sortDir not set or sortBy changed
  if (sortBy !== field.name || sortDir === undefined) {
    sortDirection = (field.sortDir || SORT_DIRECTION_DESC) as 'asc' | 'desc'
  }

  /**
   * Triggers when table heads are clicked
   *
   * @property {string} sortBy requested column to sort by
   * @property {string} sortDir requested order to sort in (either asc or desc)
   */

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
