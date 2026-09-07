<template>
  <oc-drop
    ref="dropRef"
    mode="manual"
    padding-size="small"
    class="z-10001"
    enforce-drop-on-mobile
    @hide-drop="closeMenu"
  >
    <div class="text-editor-mention-menu">
      <div v-if="loading" class="text-editor-mention-menu__status">
        <oc-spinner size="small" />
      </div>
      <ul v-else-if="items.length">
        <li v-for="(item, index) in items" :key="item.id">
          <oc-button
            appearance="raw"
            class="text-editor-mention-menu__item"
            :class="{
              'text-editor-mention-menu__item--selected': index === selectedIndex
            }"
            @click="runItem(item)"
          >
            <UserAvatar :user-id="item.id" :user-name="item.label" :width="28" />
            <span class="text-editor-mention-menu__item-label" v-text="item.label" />
          </oc-button>
        </li>
      </ul>
      <div v-else class="text-editor-mention-menu__status">
        {{ $gettext('No matching people') }}
      </div>
    </div>
  </oc-drop>
</template>

<script setup lang="ts">
import { type ComponentPublicInstance, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { exitSuggestion, type SuggestionProps } from '@tiptap/suggestion'
import { OcDrop } from '@opencloud-eu/design-system/components'
import UserAvatar from '../../components/Avatars/UserAvatar.vue'
import type { MentionItem } from '../types'
import { MentionSuggestionPluginKey } from '../extensions/mentionSuggestionKey'

interface VirtualElement {
  getBoundingClientRect: () => DOMRect
  contextElement: HTMLElement
}

const props = defineProps<SuggestionProps<MentionItem>>()

const dropRef = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('dropRef')
const selectedIndex = ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  }
)

function runItem(item: MentionItem): void {
  props.command(item)
}

function onKeyDown(event: KeyboardEvent): boolean {
  if (event.key === 'Escape') {
    event.stopPropagation()
    return false
  }

  const itemCount = props.items.length
  if (!itemCount) {
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
  document
    .querySelector('.text-editor-mention-menu__item--selected')
    ?.scrollIntoView({ block: 'nearest' })
})

function anchorElement(): VirtualElement | null {
  const rect = props.clientRect?.()
  if (!rect) {
    return null
  }
  return {
    getBoundingClientRect: () => rect,
    contextElement: props.editor.view.dom
  }
}

function onUpdate(): void {
  dropRef.value?.update?.({ anchorElement: anchorElement() })
}

function closeMenu(): void {
  if (!props.editor.isDestroyed) {
    exitSuggestion(props.editor.view, MentionSuggestionPluginKey)
  }
}

onMounted(async () => {
  await nextTick()
  dropRef.value?.show?.({ anchorElement: anchorElement(), noFocus: true })
})

defineExpose({ onUpdate, onKeyDown })
</script>

<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

.text-editor-mention-menu {
  @apply min-w-[240px] max-w-[360px] max-h-80 overflow-y-auto;
}

.text-editor-mention-menu ul {
  @apply list-none m-0 p-0;
}

.text-editor-mention-menu__item {
  @apply w-full flex items-center justify-start gap-2 px-2 py-1.5 rounded-md;
  @apply bg-transparent border-0 cursor-pointer;
}

.text-editor-mention-menu__item-label {
  @apply text-sm truncate;
}

.text-editor-mention-menu__item--selected {
  @apply bg-role-secondary-container;
}

.text-editor-mention-menu__status {
  @apply min-h-9 flex items-center justify-center text-sm opacity-70 px-2 py-1;
}
</style>
