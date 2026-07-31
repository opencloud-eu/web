<template>
  <BubbleMenu
    v-if="textEditor.editor.value"
    :editor="textEditor.editor.value"
    :should-show="shouldShow"
    :get-referenced-virtual-element="getReferencedVirtualElement"
    :options="bubbleMenuOptions"
    :update-delay="0"
    class="text-editor-table-bubble-menu"
  >
    <div
      class="flex items-center gap-1 rounded-md border border-role-border bg-role-surface p-1 shadow-lg"
    >
      <template v-for="(group, groupIndex) in tableActionGroups" :key="group.id">
        <div
          class="inline-flex items-center gap-1"
          :class="{ 'border-l border-l-role-border pl-1': groupIndex > 0 }"
        >
          <oc-button
            v-for="action in group.actions"
            :key="action.id"
            v-oc-tooltip="action.title"
            type="button"
            appearance="raw"
            class="text-editor-bubble-menu-btn inline-flex items-center justify-center p-2"
            :aria-label="action.title"
            :disabled="!isItemEnabled(action)"
            @mousedown.prevent
            @click.stop="onActionClick(action)"
          >
            <oc-icon
              :name="action.icon"
              :fill-type="action.iconFillType || 'none'"
              size-class="size-4"
            />
          </oc-button>
        </div>
      </template>
    </div>
  </BubbleMenu>
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import type { Editor } from '@tiptap/core'
import type { BubbleMenuPluginProps } from '@tiptap/extension-bubble-menu'
import type { TextEditorInstance } from '../types'
import type { EditorAction } from '../composables'

const textEditor = inject<TextEditorInstance>('textEditor')!

const shouldShow = ({ editor }: { editor: Editor }) => editor.isActive('table')

const menuOffsetPx = 16
const menuHeightPx = 42

const bubbleMenuOptions: BubbleMenuPluginProps['options'] = {
  placement: 'bottom',
  offset: menuOffsetPx,
  flip: false,
  shift: false
}

const getReferencedVirtualElement: BubbleMenuPluginProps['getReferencedVirtualElement'] = () => {
  const editor = unref(textEditor.editor)
  if (!editor) {
    return null
  }

  const { from } = editor.state.selection
  const { node } = editor.view.domAtPos(from)
  const tableElement =
    node instanceof Element ? node.closest('table') : node.parentElement?.closest('table')

  if (tableElement) {
    const tableRect = tableElement.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const maxVisibleAnchorY = viewportHeight - (menuHeightPx + menuOffsetPx * 2)
    const anchorY = Math.min(tableRect.bottom, maxVisibleAnchorY)

    return {
      getBoundingClientRect: () =>
        DOMRect.fromRect({
          x: tableRect.left,
          y: anchorY,
          width: tableRect.width,
          height: 0
        })
    }
  }

  return null
}

const tableActionGroups = computed(() => {
  const allActions = textEditor.actionGroups().flatMap((group) => group.actions)
  const actionMap = new Map(allActions.map((action) => [action.id, action]))

  const groupDefinitions = [
    {
      id: 'rows',
      actions: ['add-row-before', 'add-row-after', 'delete-row']
    },
    {
      id: 'columns',
      actions: ['add-column-before', 'add-column-after', 'delete-column']
    },
    {
      id: 'table',
      actions: ['delete-table']
    }
  ]

  return groupDefinitions
    .map((group) => ({
      id: group.id,
      actions: group.actions
        .map((actionId) => actionMap.get(actionId))
        .filter((a): a is EditorAction => a !== undefined)
    }))
    .filter((group) => group.actions.length > 0)
})

const onActionClick = (action: EditorAction) => {
  const editor = unref(textEditor.editor)
  if (!editor) {
    return
  }

  action.toolbarAction?.(editor)
}

const isItemEnabled = (item: EditorAction) => {
  const editor = unref(textEditor.editor)
  if (!editor) {
    return false
  }

  return item.isEnabled ? item.isEnabled(editor) : true
}
</script>
