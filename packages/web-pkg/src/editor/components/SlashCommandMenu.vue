<template>
  <oc-drop ref="dropRef" mode="manual" padding-size="small" class="z-10001" enforce-drop-on-mobile>
    <div class="text-editor-slash-menu">
      <template v-if="grouped.length">
        <div v-for="group in grouped" :key="group.id" class="text-editor-slash-menu__group">
          <div class="text-editor-slash-menu__group-title" v-text="group.title" />
          <ul>
            <li v-for="entry in group.entries" :key="`slash-command-item-${entry.item.id}`">
              <oc-button
                appearance="raw"
                class="text-editor-slash-menu__item"
                :class="{
                  'text-editor-slash-menu__item--selected': entry.index === selectedIndex
                }"
                @click="runItem(entry.item)"
              >
                <oc-icon
                  v-if="entry.item.icon"
                  :name="entry.item.icon"
                  :fill-type="entry.item.iconFillType || 'none'"
                  size="small"
                  class="text-editor-slash-menu__item-icon"
                />
                <span class="text-editor-slash-menu__item-text">
                  <span class="text-editor-slash-menu__item-title" v-text="entry.item.title" />
                  <span
                    v-if="entry.item.description"
                    class="text-editor-slash-menu__item-description"
                    v-text="entry.item.description"
                  />
                </span>
              </oc-button>
            </li>
          </ul>
        </div>
      </template>
      <div v-else class="text-editor-slash-menu__empty">
        {{ $gettext('No matching commands') }}
      </div>
    </div>
  </oc-drop>
</template>

<script setup lang="ts">
import {
  ComponentPublicInstance,
  computed,
  nextTick,
  onMounted,
  ref,
  useTemplateRef,
  watch
} from 'vue'
import { SuggestionProps } from '@tiptap/suggestion'
import { FlatSlashCommandItem } from '../extensions'
import { OcDrop } from '@opencloud-eu/design-system/components'

interface VirtualElement {
  getBoundingClientRect: () => DOMRect
}

const props = defineProps<SuggestionProps<FlatSlashCommandItem>>()

const dropRef = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('dropRef')
const selectedIndex = ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  }
)

interface RenderedEntry {
  item: FlatSlashCommandItem
  index: number
}
interface RenderedGroup {
  id: string
  title: string
  entries: RenderedEntry[]
}

const grouped = computed<RenderedGroup[]>(() => {
  const groups: RenderedGroup[] = []
  let currentGroup: RenderedGroup | null = null
  props.items.forEach((item, index) => {
    if (!currentGroup || currentGroup.id !== item.groupId) {
      currentGroup = { id: item.groupId, title: item.groupTitle, entries: [] }
      groups.push(currentGroup)
    }
    currentGroup.entries.push({ item, index })
  })
  return groups
})

const runItem = (item: FlatSlashCommandItem) => {
  props.command(item)
}

const onKeyDown = (event: KeyboardEvent): boolean => {
  const itemCount = props.items.length
  if (itemCount === 0) {
    return false
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % itemCount
      return true
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value - 1 + itemCount) % itemCount
      return true
    case 'Enter':
      event.preventDefault()
      runItem(props.items[selectedIndex.value])
      return true
    default:
      return false
  }
}

watch(selectedIndex, async () => {
  await nextTick()
  const el = dropRef.value?.$el?.querySelector('.text-editor-slash-menu__item--selected')
  el?.scrollIntoView({ block: 'nearest' })
})

const onUpdate = () => {
  dropRef.value?.update?.({ anchorElement: anchorElement() })
}

const anchorElement = (): VirtualElement | null => {
  const rect = props.clientRect?.()
  if (!rect) {
    return null
  }
  return {
    getBoundingClientRect: () => rect
  }
}

onMounted(async () => {
  await nextTick()
  dropRef.value?.show?.({ anchorElement: anchorElement(), noFocus: true })
})

defineExpose({ onUpdate, onKeyDown })
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

.text-editor-slash-menu {
  @apply flex flex-col min-w-[240px];
}

.text-editor-slash-menu__group {
  @apply pb-2 last:pb-0;
}

.text-editor-slash-menu__group-title {
  @apply text-xs uppercase tracking-wide opacity-70 px-2 pb-1;
}

.text-editor-slash-menu__group ul {
  @apply list-none m-0 p-0;
}

.text-editor-slash-menu__item {
  @apply w-full flex items-start justify-start gap-2 px-2 py-1.5 text-left rounded-md;
  @apply bg-transparent border-0 cursor-pointer;
}

.text-editor-slash-menu__item-icon {
  @apply mt-0.5 shrink-0;
}

.text-editor-slash-menu__item-text {
  @apply flex flex-col;
}

.text-editor-slash-menu__item-title {
  @apply text-sm font-medium;
}

.text-editor-slash-menu__item-description {
  @apply text-xs opacity-70;
}

.text-editor-slash-menu__item--selected {
  @apply bg-role-secondary-container;
}

.text-editor-slash-menu__empty {
  @apply text-sm opacity-70 px-2 py-1;
}
</style>
