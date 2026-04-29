<template>
  <div v-if="visible" class="text-editor-toolbar relative border-b border-b-role-border py-1">
    <div
      ref="scrollContainer"
      class="flex items-center gap-1 overflow-x-auto"
      @scroll="updateScrollState"
    >
      <div
        v-for="(group, groupIndex) in textEditor.actionGroups()"
        :key="`toolbar-group-${group.id}`"
        class="text-editor-toolbar-group inline-flex items-stretch"
        :class="{ 'border-l border-l-role-border pl-1': groupIndex > 0 }"
      >
        <template v-for="item in group.actions" :key="`toolbar-item-${item.id}`">
          <template v-if="item.isDropdown && item.dropdownOptions">
            <oc-button
              :id="`toolbar-dropdown-trigger-${item.id}`"
              type="button"
              appearance="raw"
              class="text-editor-toolbar-btn min-w-[52px] inline-flex items-center justify-center"
              :class="{
                'text-editor-toolbar-btn--active': isItemActive(item)
              }"
              :aria-label="item.title"
              :disabled="!isItemEnabled(item)"
            >
              <oc-icon :name="item.icon" :fill-type="item.iconFillType || 'none'" size="small" />
              <oc-icon name="arrow-down-s" fill-type="line" size="small" />
            </oc-button>
            <oc-drop
              :drop-id="`toolbar-dropdown-${item.id}`"
              :toggle="`#toolbar-dropdown-trigger-${item.id}`"
              mode="click"
              class="text-editor-toolbar-dropdown"
              padding-size="small"
            >
              <ul class="oc-list">
                <li
                  v-for="option in item.dropdownOptions"
                  :key="`${item.id}-${option.value}`"
                  class="oc-rounded oc-menu-item-hover"
                >
                  <oc-button
                    appearance="raw"
                    justify-content="space-between"
                    class="oc-width-1-1 oc-p-xs"
                    @click="item.toolbarAction?.(textEditor.editor.value!, option.value)"
                  >
                    <oc-icon
                      v-if="option.value === getCurrentValue(item)"
                      name="check"
                      fill-type="line"
                      size="small"
                    />
                    <span>{{ option.label }}</span>
                  </oc-button>
                </li>
              </ul>
            </oc-drop>
          </template>
          <oc-button
            v-else
            v-oc-tooltip="item.title"
            type="button"
            appearance="raw"
            class="text-editor-toolbar-btn min-w-[42px] inline-flex items-center justify-center"
            :class="{ 'text-editor-toolbar-btn--active': isItemActive(item) }"
            :aria-label="item.title"
            :disabled="!isItemEnabled(item)"
            @click.stop="item.toolbarAction?.(textEditor.editor.value!)"
          >
            <oc-icon :name="item.icon" :fill-type="item.iconFillType || 'none'" size="small" />
          </oc-button>
        </template>
      </div>
    </div>
    <div
      v-if="canScrollLeft"
      class="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/15 to-transparent"
    />
    <div
      v-if="canScrollRight"
      class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/15 to-transparent"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, unref, useTemplateRef, watch } from 'vue'
import type { TextEditorInstance } from '../types'

const textEditor = inject<TextEditorInstance>('textEditor')!

const scrollContainerRef = useTemplateRef('scrollContainer')
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const updateScrollState = () => {
  const el = scrollContainerRef.value
  if (!el) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }
  canScrollLeft.value = el.scrollLeft > 0
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

onMounted(async () => {
  await nextTick()
  updateScrollState()
})

const visible = computed(() => {
  if (unref(textEditor.readonly)) {
    return false
  }
  if (unref(textEditor.contentType) === 'plain-text') {
    return false
  }
  return !!unref(textEditor.editor)
})

// Track editor state changes to trigger reactivity
const editorStateKey = ref(0)

watch(
  () => unref(textEditor.editor),
  (editor, oldEditor) => {
    if (oldEditor) {
      oldEditor.off('selectionUpdate', updateEditorState)
      oldEditor.off('transaction', updateEditorState)
    }
    if (editor) {
      editor.on('selectionUpdate', updateEditorState)
      editor.on('transaction', updateEditorState)
    }
  },
  { immediate: true }
)

const updateEditorState = () => {
  editorStateKey.value++
}

const isItemEnabled = (item: any) => {
  // Access editorStateKey to make this reactive to editor state changes
  editorStateKey.value

  const editor = unref(textEditor.editor)
  if (!editor) {
    return false
  }

  if (item.isEnabled) {
    return item.isEnabled(editor)
  }
  return true
}

const isItemActive = (item: any) => {
  // Access editorStateKey to make this reactive to editor state changes
  editorStateKey.value

  const editor = unref(textEditor.editor)
  if (!editor) {
    return false
  }

  if (item.isActive) {
    return item.isActive(editor)
  }
  return false
}

const getCurrentValue = (item: any) => {
  // Access editorStateKey to make this reactive to editor state changes
  editorStateKey.value

  const editor = unref(textEditor.editor)
  if (!editor || !item.currentValue) {
    return undefined
  }

  return item.currentValue(editor)
}
</script>

<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

/* Hide scrollbar in toolbar */
.text-editor-toolbar > div:first-child {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.text-editor-toolbar > div:first-child::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.text-editor-toolbar-btn {
  @apply h-[42px];
  gap: 0 !important;
}
.text-editor-toolbar-btn--active {
  @apply bg-role-secondary-container;
}
</style>
