<template>
  <oc-tr
    :lazy="lazy ? { colspan: fullColspan } : undefined"
    :data-item-id="item[idKey as keyof Item]"
    :draggable="dragDrop"
    class="oc-tbody-tr border-t h-10.5"
    :class="rowClasses"
    @click="$emit('click', $event)"
    @contextmenu="$emit('contextmenu', $event)"
    @dragstart="$emit('dragstart', $event)"
    @drop="$emit('drop', $event)"
    @dragenter.prevent="$emit('dragenter', $event)"
    @dragleave.prevent="$emit('dragleave', $event)"
    @dragover.prevent
    @item-visible="$emit('itemVisible')"
  >
    <oc-td
      v-for="(field, tdIndex) in fields"
      :key="'oc-tbody-td-' + cellKey(field, tdIndex, item)"
      v-bind="extractTdProps(field, tdIndex, item)"
    >
      <slot
        v-if="isFieldTypeSlot(field)"
        :name="field.name"
        :item="item"
        :highlighted="highlighted"
      />
      <template v-else-if="isFieldTypeCallback(field)">
        {{ field.callback(item[field.name as keyof Item]) }}
      </template>
      <template v-else>
        {{ item[field.name as keyof Item] }}
      </template>
    </oc-td>
  </oc-tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import OcTr from '../OcTableTr/OcTableTr.vue'
import OcTd from '../OcTableTd/OcTableTd.vue'
import {
  Item as BaseItem,
  FieldType,
  SizeType,
  extractCellProps,
  getTailwindXPadding
} from '../../helpers'

type Item = BaseItem & any

export interface Props {
  /**
   * @docs The item (row data) to be rendered.
   */
  item: Item
  /**
   * @docs The fields to be displayed as table cells.
   */
  fields: FieldType[]
  /**
   * @docs A precomputed dom selector used for the row's identifying class.
   */
  domSelector: string | number
  /**
   * @docs Resolves whether the row should be highlighted. Kept as a stable
   * function reference so the parent table's render does not subscribe to
   * selection state - only the affected row re-renders.
   */
  isHighlighted: (item: Item) => boolean
  /**
   * @docs Resolves whether the row should be disabled.
   */
  isDisabled: (item: Item) => boolean
  /**
   * @docs The key to be used as the unique identifier for each row.
   * @default 'id'
   */
  idKey?: string
  /**
   * @docs Determines if the row should be lazy loaded.
   * @default false
   */
  lazy?: boolean
  /**
   * @docs Determines if the row is draggable.
   * @default false
   */
  dragDrop?: boolean
  /**
   * @docs The horizontal padding size of the row's cells.
   * @default small
   */
  paddingX?: SizeType | 'remove'
}

const {
  item,
  fields,
  domSelector,
  isHighlighted,
  isDisabled,
  idKey = 'id',
  lazy = false,
  dragDrop = false,
  paddingX = 'small'
} = defineProps<Props>()

defineEmits<{
  (e: 'click', event: MouseEvent): void
  (e: 'contextmenu', event: MouseEvent): void
  (e: 'dragstart', event: DragEvent): void
  (e: 'drop', event: DragEvent): void
  (e: 'dragenter', event: DragEvent): void
  (e: 'dragleave', event: DragEvent): void
  (e: 'itemVisible'): void
}>()

defineSlots<{
  [dynamicSlot: string]: (props: { item: Item; highlighted: boolean }) => unknown
}>()

const highlighted = computed(() => isHighlighted(item))
const disabled = computed(() => isDisabled(item))

const fullColspan = computed(() => fields.length)

const rowClasses = computed(() => {
  return [
    `oc-tbody-tr-${domSelector}`,
    highlighted.value ? 'oc-table-highlighted' : undefined,
    ...(disabled.value
      ? ['oc-table-disabled', 'opacity-70', 'pointer-events-none', 'grayscale-60']
      : [])
  ].filter(Boolean)
})

const isFieldTypeSlot = (field: FieldType) => {
  return field.type === 'slot'
}

const isFieldTypeCallback = (field: FieldType) => {
  return ['callback', 'function'].indexOf(field.type) >= 0
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
    props.class += ` ${getTailwindXPadding(paddingX, 'left')} `
  }

  if (index === fields.length - 1) {
    props.class += ` ${getTailwindXPadding(paddingX, 'right')}`
  }

  if (Object.prototype.hasOwnProperty.call(field, 'accessibleLabelCallback')) {
    props['aria-label'] = field.accessibleLabelCallback(item)
  }

  return props
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
</script>
