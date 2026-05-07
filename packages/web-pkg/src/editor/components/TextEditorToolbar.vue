<template>
  <div v-if="visible" class="text-editor-toolbar relative border-b border-b-role-border py-1">
    <div
      ref="scrollContainer"
      class="flex items-center gap-1 overflow-x-auto before:grow after:grow"
      @scroll="updateScrollState"
    >
      <div
        v-for="(group, groupIndex) in textEditor.actionGroups()"
        :key="`toolbar-group-${group.id}`"
        class="text-editor-toolbar-group inline-flex items-stretch"
        :class="{ 'border-l border-l-role-border pl-1': groupIndex > 0 }"
      >
        <template
          v-for="item in group.actions.filter((a) => a.showInToolbar !== false)"
          :key="`toolbar-item-${item.id}`"
        >
          <template v-if="item.childActions">
            <oc-button
              :id="`toolbar-dropdown-trigger-${item.id}`"
              v-oc-tooltip="item.title"
              type="button"
              appearance="raw"
              class="text-editor-toolbar-btn min-w-[52px] inline-flex items-center justify-center p-2"
              :class="{
                'text-editor-toolbar-btn--active': isItemActive(item)
              }"
              :aria-label="item.title"
            >
              <oc-icon
                :name="getActiveIcon(item).icon"
                :fill-type="getActiveIcon(item).iconFillType || 'none'"
                size="small"
              />
              <oc-icon name="arrow-down-s" fill-type="line" size="small" />
            </oc-button>
            <oc-drop
              :drop-id="`toolbar-dropdown-${item.id}`"
              :toggle="`#toolbar-dropdown-trigger-${item.id}`"
              mode="click"
              class="text-editor-toolbar-dropdown w-auto min-w-40"
              padding-size="small"
              close-on-click
            >
              <ul class="oc-list">
                <li
                  v-for="child in item.childActions"
                  :key="`${item.id}-${child.id}`"
                  class="oc-rounded oc-menu-item-hover"
                >
                  <oc-button
                    :appearance="isItemActive(child) ? 'filled' : 'raw-inverse'"
                    :color-role="isItemActive(child) ? 'secondaryContainer' : 'surface'"
                    :no-hover="isItemActive(child)"
                    justify-content="space-between"
                    class="p-1"
                    :disabled="!isItemEnabled(child)"
                    @click="child.toolbarAction?.(textEditor.editor.value!)"
                  >
                    <span class="inline-flex items-center gap-2">
                      <oc-icon
                        :name="child.icon"
                        :fill-type="child.iconFillType || 'none'"
                        size="small"
                      />
                      <span>{{ child.title }}</span>
                    </span>
                    <oc-icon
                      v-if="isItemActive(child)"
                      name="check"
                      fill-type="line"
                      size="small"
                    />
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
            class="text-editor-toolbar-btn min-w-[42px] inline-flex items-center justify-center p-2"
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
import { EditorAction } from '../composables'

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

const isItemEnabled = (item: EditorAction) => {
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

const isItemActive = (item: EditorAction) => {
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

const getActiveIcon = (item: EditorAction) => {
  // Access editorStateKey to make this reactive to editor state changes
  editorStateKey.value

  const editor = unref(textEditor.editor)
  if (editor && item.activeIcon) {
    const active = item.activeIcon(editor)
    if (active) {
      return active
    }
  }
  return { icon: item.icon, iconFillType: item.iconFillType }
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
  gap: 0 !important;
}
.text-editor-toolbar-btn--active {
  @apply bg-role-secondary-container;
}
</style>
