<template>
  <oc-drop
    ref="dropRef"
    mode="manual"
    :is-menu="true"
    :anchor="anchorGetter"
    padding-size="small"
    title="Insert"
  >
    <div class="text-editor-slash-menu" @mousedown.prevent>
      <template v-if="grouped.length">
        <div v-for="group in grouped" :key="group.id" class="text-editor-slash-menu__group">
          <div class="text-editor-slash-menu__group-title" v-text="group.title" />
          <ul>
            <li v-for="entry in group.entries" :key="entry.item.id">
              <oc-button
                appearance="raw"
                class="text-editor-slash-menu__item"
                :class="{ 'is-selected': selectedIndex === entry.index }"
                @click="runItem(entry.item)"
                @mouseenter="selectedIndex = entry.index"
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
        {{ noResultsLabel }}
      </div>
    </div>
  </oc-drop>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { FlatSlashCommandItem } from '../extensions'

interface VirtualElement {
  getBoundingClientRect: () => DOMRect
}

interface OcDropHandle {
  show: (opts?: { noFocus?: boolean }) => void
  hide: () => void
  update: () => void
}

const props = defineProps<SuggestionProps<FlatSlashCommandItem>>()

const noResultsLabel = 'No matching commands'

const dropRef = useTemplateRef<OcDropHandle>('dropRef')
const selectedIndex = ref(0)

const anchorGetter = (): VirtualElement | null => {
  const rect = props.clientRect?.()
  if (!rect) {
    return null
  }
  return {
    getBoundingClientRect: () => rect
  }
}

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

const runSelected = () => {
  const item = props.items[selectedIndex.value]
  if (item) {
    runItem(item)
  }
}

const onUpdate = (_props: SuggestionProps<FlatSlashCommandItem>) => {
  // props are reactive through defineProps; we just need to clamp selection
  // and re-position the drop against the (likely changed) clientRect.
  if (selectedIndex.value >= props.items.length) {
    selectedIndex.value = 0
  }
  dropRef.value?.update?.()
}

const onKeyDown = ({ event }: SuggestionKeyDownProps): boolean => {
  const total = props.items.length
  if (event.key === 'ArrowDown') {
    if (total === 0) return true
    selectedIndex.value = (selectedIndex.value + 1) % total
    return true
  }
  if (event.key === 'ArrowUp') {
    if (total === 0) return true
    selectedIndex.value = (selectedIndex.value - 1 + total) % total
    return true
  }
  if (event.key === 'Enter' || event.key === 'Tab') {
    if (total === 0) return false
    runSelected()
    return true
  }
  return false
}

watch(
  () => props.items.length,
  () => {
    if (selectedIndex.value >= props.items.length) {
      selectedIndex.value = 0
    }
  }
)

onMounted(async () => {
  await nextTick()
  dropRef.value?.show?.({ noFocus: true })
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

.text-editor-slash-menu__item.is-selected,
.text-editor-slash-menu__item:hover {
  @apply bg-role-surface-variant;
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

.text-editor-slash-menu__empty {
  @apply text-sm opacity-70 px-2 py-1;
}
</style>
