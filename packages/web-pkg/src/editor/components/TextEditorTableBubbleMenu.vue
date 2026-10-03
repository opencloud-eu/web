<template>
  <BubbleMenu
    v-if="textEditor?.editor.value && !textEditor.readonly.value"
    :editor="textEditor.editor.value"
    :plugin-key="pluginKey"
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
import { computed, inject, nextTick, unref } from 'vue'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import type { Editor } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import type { BubbleMenuPluginProps } from '@tiptap/extension-bubble-menu'
import type { TextEditorInstance } from '../types'
import type { EditorAction } from '../composables'

const textEditor = inject<TextEditorInstance | undefined>('textEditor')

const shouldShow = ({ editor }: { editor: Editor }) => editor.isActive('table')

const menuOffsetPx = 16
const menuHeightPx = 42

const pluginKey = new PluginKey('textEditorTableBubbleMenu')

function updatePosition() {
  const editor = unref(textEditor?.editor)
  editor?.view.dispatch(editor.state.tr.setMeta(pluginKey, 'updatePosition'))
}

// the editor content scrolls inside its own container, not the window, so keep the menu attached while scrolling
let scrollFrame: number | undefined
function onScroll() {
  if (scrollFrame) {
    return
  }
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = undefined
    updatePosition()
  })
}

function removeScrollListener() {
  document.removeEventListener('scroll', onScroll, { capture: true })
}

const bubbleMenuOptions: BubbleMenuPluginProps['options'] = {
  placement: 'bottom',
  offset: menuOffsetPx,
  flip: false,
  shift: { padding: 8 },
  onShow: () => {
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    // the actions render after the menu has been positioned, so position it again once they are in place
    nextTick(updatePosition)
  },
  onHide: removeScrollListener,
  onDestroy: removeScrollListener
}

const getReferencedVirtualElement: BubbleMenuPluginProps['getReferencedVirtualElement'] = () => {
  const editor = unref(textEditor?.editor)
  if (!editor) {
    return null
  }

  const { from } = editor.state.selection
  const { node } = editor.view.domAtPos(from)
  const tableElement =
    node instanceof Element ? node.closest('table') : node.parentElement?.closest('table')

  if (tableElement) {
    const tableRect = tableElement.getBoundingClientRect()
    const cellRect = (
      tableElement.querySelector('.selectedCell') ??
      getCellElement(node) ??
      tableElement
    ).getBoundingClientRect()

    const viewportHeight = window.innerHeight
    const maxVisibleAnchorY = viewportHeight - (menuHeightPx + menuOffsetPx * 2)
    let anchorY = Math.min(tableRect.bottom, maxVisibleAnchorY)
    // when the menu gets pinned to the bottom of the viewport, it must not cover the active cell
    const menuTop = anchorY + menuOffsetPx
    if (menuTop < cellRect.bottom && menuTop + menuHeightPx > cellRect.top) {
      anchorY = cellRect.top - menuHeightPx - menuOffsetPx * 2
    }

    // keep the menu centered in the visible editor area, wide tables would push it off to the side otherwise
    const { left, right } = getVisibleHorizontalRange(tableElement)

    return {
      getBoundingClientRect: () =>
        DOMRect.fromRect({
          x: left,
          y: anchorY,
          width: right - left,
          height: 0
        })
    }
  }

  return null
}

function getCellElement(node: Node) {
  return node instanceof Element ? node.closest('td, th') : node.parentElement?.closest('td, th')
}

// the area that is actually visible horizontally, i.e. the viewport minus everything clipped by scroll containers
function getVisibleHorizontalRange(element: Element) {
  let left = 0
  let right = window.innerWidth

  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (getComputedStyle(ancestor).overflowX === 'visible') {
      continue
    }
    const rect = ancestor.getBoundingClientRect()
    left = Math.max(left, rect.left)
    right = Math.min(right, rect.right)
  }

  return { left, right }
}

const groupDefinitions = [
  {
    id: 'rows',
    actions: ['toggle-header-row', 'add-row-before', 'add-row-after', 'delete-row']
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

const tableActionGroups = computed(() => {
  if (!textEditor) {
    return []
  }

  const editor = unref(textEditor.editor)
  if (!editor) {
    return []
  }

  const allActions = textEditor.actionGroups().flatMap((group) => group.actions)
  const actionMap = new Map(allActions.map((action) => [action.id, action]))

  return groupDefinitions
    .map((group) => ({
      id: group.id,
      actions: group.actions
        .map((actionId) => actionMap.get(actionId))
        .filter((a): a is EditorAction => a !== undefined)
        .filter((action) => !action.isEnabled || action.isEnabled(editor))
    }))
    .filter((group) => group.actions.length > 0)
})

const onActionClick = (action: EditorAction) => {
  const editor = unref(textEditor?.editor)
  if (!editor) {
    return
  }

  action.toolbarAction?.(editor)
}
</script>
