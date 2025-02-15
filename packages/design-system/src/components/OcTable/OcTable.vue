<template>
  <table v-bind="extractTableProps()" class="has-item-context-menu">
    <oc-thead v-if="hasHeader">
      <oc-tr class="oc-table-header-row">
        <oc-th
          v-for="(field, index) in fields"
          :key="`oc-thead-${field.name}`"
          v-bind="extractThProps(field, index)"
        >
          <oc-button
            v-if="field.sortable"
            :aria-label="getSortLabel(field.name)"
            appearance="raw"
            class="oc-button-sort oc-width-1-1"
            @click="handleSort(field)"
          >
            <span v-if="field.headerType === 'slot'" class="oc-table-thead-content">
              <slot :name="field.name + 'Header'" />
            </span>
            <span
              v-else
              class="oc-table-thead-content header-text"
              v-text="extractFieldTitle(field)"
            />
            <oc-icon
              :name="sortDir === 'asc' ? 'arrow-down' : 'arrow-up'"
              fill-type="line"
              :class="{ 'oc-invisible-sr': sortBy !== field.name }"
              size="small"
              variation="passive"
            />
          </oc-button>
          <div v-else>
            <span v-if="field.headerType === 'slot'" class="oc-table-thead-content">
              <slot :name="field.name + 'Header'" />
            </span>
            <span
              v-else
              class="oc-table-thead-content header-text"
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
        @click="$emit(constants.EVENT_TROW_CLICKED, [item, $event])"
        @contextmenu="
          $emit(
            constants.EVENT_TROW_CONTEXTMENU,
            ($refs[`row-${trIndex}`] as HTMLElement[])[0],
            $event,
            item
          )
        "
        @vue:mounted="
          $emit(constants.EVENT_TROW_MOUNTED, item, ($refs[`row-${trIndex}`] as HTMLElement[])[0])
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
    <tfoot v-if="$slots.footer" class="oc-table-footer">
      <tr class="oc-table-footer-row">
        <td :colspan="fullColspan" class="oc-table-footer-cell">
          <!-- @slot Footer of the table -->
          <slot name="footer" />
        </td>
      </tr>
    </tfoot>
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import OcThead from '../OcTableHead/OcTableHead.vue'
import OcTbody from '../OcTableBody/OcTableBody.vue'
import OcTr from '../OcTableTr/OcTableTr.vue'
import OcTh from '../OcTableTh/OcTableTh.vue'
import OcTd from '../OcTableTd/OcTableTd.vue'
import OcButton from '../OcButton/OcButton.vue'
import { getSizeClass, Item as BaseItem, FieldType } from '../../helpers'
import {
  EVENT_THEAD_CLICKED,
  EVENT_TROW_CLICKED,
  EVENT_TROW_MOUNTED,
  EVENT_TROW_CONTEXTMENU,
  EVENT_ITEM_DROPPED,
  EVENT_ITEM_DRAGGED,
  EVENT_SORT
} from '../../helpers/constants'
import { useGettext } from 'vue3-gettext'

const SORT_DIRECTION_ASC = 'asc' as const
const SORT_DIRECTION_DESC = 'desc' as const

type Item = BaseItem & any

export interface Props {
  data: Item[]
  fields: FieldType[]
  disabled?: Array<string | number>
  dragDrop?: boolean
  hasHeader?: boolean
  headerPosition?: number
  highlighted?: string | string[]
  hover?: boolean
  idKey?: string
  itemDomSelector?: (item: Item) => string
  lazy?: boolean
  paddingX?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  sticky?: boolean
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

const emit = defineEmits([
  EVENT_ITEM_DROPPED,
  EVENT_ITEM_DRAGGED,
  EVENT_THEAD_CLICKED,
  EVENT_TROW_CLICKED,
  EVENT_TROW_MOUNTED,
  EVENT_TROW_CONTEXTMENU,
  EVENT_SORT,
  'dropRowStyling',
  'itemVisible'
])

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

const extractThProps = (field: FieldType, index: number) => {
  const props = extractCellProps(field)
  props.class = `oc-table-header-cell oc-table-header-cell-${field.name}`
  if (Object.prototype.hasOwnProperty.call(field, 'thClass')) {
    props.class += ` ${field.thClass}`
  }
  if (sticky) {
    props.style = `top: ${headerPosition}px;`
  }

  if (index === 0) {
    props.class += ` oc-pl-${getSizeClass(paddingX)} `
  }

  if (index === fields.length - 1) {
    props.class += ` oc-pr-${getSizeClass(paddingX)}`
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
      isDisabled(item) ? 'oc-table-disabled' : undefined
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
    props.class += ` oc-pl-${getSizeClass(paddingX)} `
  }

  if (index === fields.length - 1) {
    props.class += ` oc-pr-${getSizeClass(paddingX)}`
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

<style lang="scss">
.oc-table {
  border-collapse: collapse;
  border-spacing: 0;
  color: var(--oc-color-text-default);
  width: 100%;

  &-hover tr {
    transition: background-color $transition-duration-short ease-in-out;
  }

  tr {
    outline: none;
    height: var(--oc-size-height-table-row);
  }

  tr + tr {
    border-top: 1px solid var(--oc-color-border);
  }

  &-hover tr:not(&-footer-row):hover {
    background-color: var(--oc-color-background-hover);
  }

  &-hover
    tr:hover
    td:not(:last-child)
    span:not(.avatarInitials):not(button span):not(.oc-table-highlighted span) {
    color: var(--oc-color-swatch-brand-contrast) !important;
  }

  &-highlighted {
    background-color: var(--oc-color-background-highlight) !important;
  }

  &-accentuated {
    background-color: var(--oc-color-background-accentuate);
  }

  &-disabled {
    background-color: var(--oc-color-background-muted);
    opacity: 0.7;
    filter: grayscale(0.6);
    pointer-events: none;
  }

  &-sticky {
    position: relative;

    .oc-table-header-cell {
      background-color: var(--oc-color-background-default);
      position: sticky;
      z-index: 1;
    }
  }

  .highlightedDropTarget {
    background-color: var(--oc-color-input-border);
  }

  &-thead-content {
    vertical-align: middle;
    display: inline-table;
    color: var(--oc-color-swatch-passive-default);
    &:hover {
      text-decoration: underline;
    }
  }

  &-footer {
    border-top: 1px solid var(--oc-color-border);

    &-cell {
      color: var(--oc-color-text-muted);
      font-size: 0.875rem;
      line-height: 1.4;
      padding: var(--oc-space-xsmall);
    }
  }
}
.oc-button-sort {
  display: flex;
  justify-content: start;
  .oc-icon {
    &:hover {
      background-color: var(--oc-color-background-hover);
    }
  }
}
</style>
