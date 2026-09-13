<template>
  <div
    v-if="visible"
    class="text-editor-toolbar flex items-center border-b border-b-role-border py-1"
  >
    <div
      ref="itemsRow"
      class="text-editor-toolbar-items relative flex min-w-0 grow items-center gap-1 overflow-hidden before:grow after:grow"
    >
      <div
        v-for="group in renderedGroups"
        :key="`toolbar-group-${group.id}`"
        class="text-editor-toolbar-group items-stretch"
        :class="
          group.hasVisibleActions
            ? { 'inline-flex': true, 'border-l border-l-role-border pl-1': group.showSeparator }
            : 'contents'
        "
      >
        <text-editor-toolbar-item
          v-for="item in group.actions"
          :key="`toolbar-item-${item.id}`"
          :item="item"
          :teleport="dropTeleport"
          :measure-only="!visibleItemIds.includes(item.id)"
          @register-drop="setDropRef"
        />
      </div>
      <div
        class="text-editor-toolbar-group items-stretch"
        :class="hasOverflow ? 'inline-flex border-l border-l-role-border pl-1' : 'contents'"
      >
        <oc-button
          id="toolbar-overflow-trigger"
          v-oc-tooltip="moreActionsLabel"
          type="button"
          appearance="raw"
          class="text-editor-toolbar-btn text-editor-toolbar-overflow-trigger min-w-[42px] inline-flex items-center justify-center p-2"
          :class="{
            'absolute left-0 top-0 invisible pointer-events-none': !hasOverflow,
            'bg-role-secondary-container': isOverflowMenuOpen
          }"
          :aria-label="moreActionsLabel"
          :aria-hidden="!hasOverflow"
          :tabindex="hasOverflow ? undefined : -1"
          gap-size="none"
          data-item-id="overflow-trigger"
          @mousedown.prevent
          @click.stop
        >
          <oc-icon name="more" fill-type="line" size-class="size-4" />
        </oc-button>
      </div>
      <oc-drop
        v-if="hasOverflow"
        ref="overflowDrop"
        drop-id="toolbar-overflow"
        toggle="#toolbar-overflow-trigger"
        :teleport="dropTeleport"
        mode="click"
        position="bottom"
        class="text-editor-toolbar-overflow-drop !w-auto !overflow-visible !border-none !bg-transparent !shadow-none"
        :max-width="availableWidth"
        enforce-drop-on-mobile
        :close-on-click="false"
        @show-drop="isOverflowMenuOpen = true"
        @hide-drop="isOverflowMenuOpen = false"
      >
        <template #special>
          <OcBubbleMenu
            class="text-editor-toolbar-overflow-menu max-w-full flex-wrap justify-center gap-1 px-3"
          >
            <div
              v-for="(group, groupIndex) in overflowGroups"
              :key="`toolbar-overflow-group-${group.id}`"
              class="inline-flex items-stretch"
              :class="{ 'border-l border-l-role-border pl-1': groupIndex > 0 }"
            >
              <text-editor-toolbar-item
                v-for="item in group.actions"
                :key="`toolbar-overflow-item-${item.id}`"
                :item="item"
                id-prefix="toolbar-overflow"
                :teleport="dropTeleport"
                @register-drop="setDropRef"
                @action-click="overflowDropRef?.hide?.()"
              />
            </div>
          </OcBubbleMenu>
        </template>
      </oc-drop>
    </div>
    <div
      v-if="showCollaborationStatusIndicator || collaborators.length"
      class="text-editor-toolbar-status flex shrink-0 items-center gap-2 px-4 ml-4"
    >
      <text-editor-collaborators
        v-if="collaborators.length"
        :users="collaborators"
        :teleport="dropTeleport"
      />
      <div
        v-if="showCollaborationStatusIndicator"
        v-oc-tooltip="collaborationStatusLabel"
        class="text-editor-toolbar-collaboration-status inline-flex items-center"
        :aria-label="collaborationStatusLabel"
        :data-test-yjs-status="yjsStatus"
      >
        <span
          class="inline-flex size-6 items-center justify-center rounded-full border"
          :class="collaborationStatusClasses"
        >
          <oc-icon :name="collaborationStatusIcon" fill-type="line" size-class="size-4" />
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { TextEditorInstance } from '../types'
import type { EditorAction, EditorActionGroup } from '../composables'
import { OcBubbleMenu, OcDrop } from '@opencloud-eu/design-system/components'
import TextEditorToolbarItem from './TextEditorToolbarItem.vue'
import TextEditorCollaborators from './TextEditorCollaborators.vue'
import { isEditorActionEnabled } from '../helpers'
import { Key, Modifier, useKeyboardActions } from '../../composables/keyboardActions'
import { YjsStatus } from '../../composables/yjs'

const { actionsToDisplay = undefined, teleport = undefined } = defineProps<{
  actionsToDisplay?: string[]
  teleport?: string
}>()

const textEditor = inject<TextEditorInstance>('textEditor')!
const { $gettext } = useGettext()

/** Gap, border and padding that a group adds in front of its first action. */
const groupSeparatorWidth = 9

const itemsRowRef = useTemplateRef('itemsRow')
const overflowDropRef = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('overflowDrop')
const availableWidth = ref(0)
const isOverflowMenuOpen = ref(false)
const itemWidths = ref<Record<string, number>>({})

const keyActionIds: string[] = []

const moreActionsLabel = computed(() => $gettext('More actions'))
const sourceMode = computed(() => unref(textEditor.state.sourceMode))
const dropTeleport = computed(() => teleport || 'body')

const isToolbarItemVisible = (item: EditorAction) => {
  if (!actionsToDisplay) {
    return item.showInToolbar !== false
  }

  return actionsToDisplay.includes(item.id)
}

const toolbarGroups = computed<EditorActionGroup[]>(() => {
  return textEditor
    .actionGroups()
    .map((group) => ({
      ...group,
      actions: group.actions.filter(isToolbarItemVisible)
    }))
    .filter((group) => group.actions.length)
})

const allActions = computed(() => unref(toolbarGroups).flatMap((group) => group.actions))

/**
 * Ids of the actions that fit into the toolbar. Actions that don't fit
 * move into the bubble menu.
 */
const visibleItemIds = computed<string[]>(() => {
  const widths = unref(itemWidths)
  const available = unref(availableWidth)
  const groups = unref(toolbarGroups)
  const allIds = unref(allActions).map((action) => action.id)

  if (!available || !Object.keys(widths).length) {
    return allIds
  }

  const getWidth = (id: string) => widths[id] ?? 0
  const totalWidth = groups.reduce((total, group, index) => {
    const actionsWidth = group.actions.reduce((sum, action) => sum + getWidth(action.id), 0)
    return total + actionsWidth + (index > 0 ? groupSeparatorWidth : 0)
  }, 0)

  if (totalWidth <= available) {
    return allIds
  }

  const budget = available - getWidth('overflow-trigger') - groupSeparatorWidth
  const ids: string[] = []
  let usedWidth = 0

  for (const group of groups) {
    let isFirstOfGroup = true
    for (const action of group.actions) {
      const width = getWidth(action.id) + (isFirstOfGroup && ids.length ? groupSeparatorWidth : 0)
      if (usedWidth + width > budget) {
        return ids
      }
      usedWidth += width
      isFirstOfGroup = false
      ids.push(action.id)
    }
  }

  return ids
})

const hasOverflow = computed(() => unref(visibleItemIds).length < unref(allActions).length)

const renderedGroups = computed(() => {
  let visibleGroupCount = 0

  return unref(toolbarGroups).map((group) => {
    const hasVisibleActions = group.actions.some((action) =>
      unref(visibleItemIds).includes(action.id)
    )
    const showSeparator = hasVisibleActions && visibleGroupCount > 0

    if (hasVisibleActions) {
      visibleGroupCount++
    }

    return { ...group, hasVisibleActions, showSeparator }
  })
})

const overflowGroups = computed<EditorActionGroup[]>(() => {
  return unref(toolbarGroups)
    .map((group) => ({
      ...group,
      actions: group.actions.filter((action) => !unref(visibleItemIds).includes(action.id))
    }))
    .filter((group) => group.actions.length)
})

let resizeObserver: ResizeObserver | undefined
let measureFrame: number | undefined
let observedItemIds = ''

function measure() {
  const el = unref(itemsRowRef)
  if (!el) {
    return
  }

  availableWidth.value = el.clientWidth

  const widths: Record<string, number> = {}
  el.querySelectorAll<HTMLElement>('[data-item-id]').forEach((node) => {
    widths[node.dataset.itemId!] = node.getBoundingClientRect().width
  })

  const hasChanged = Object.keys(widths).some((id) => widths[id] !== unref(itemWidths)[id])
  if (hasChanged || Object.keys(widths).length !== Object.keys(unref(itemWidths)).length) {
    itemWidths.value = widths
  }
}

/** Defers the layout reads out of the ResizeObserver callback to avoid observer loops. */
function scheduleMeasure() {
  if (measureFrame !== undefined) {
    return
  }

  measureFrame = requestAnimationFrame(() => {
    measureFrame = undefined
    measure()
  })
}

function observeItems() {
  const el = unref(itemsRowRef)
  if (!resizeObserver || !el) {
    return
  }

  const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-item-id]'))
  const itemIds = nodes.map((node) => node.dataset.itemId).join(',')
  if (itemIds === observedItemIds) {
    return
  }

  observedItemIds = itemIds
  resizeObserver.disconnect()
  resizeObserver.observe(el)
  nodes.forEach((node) => resizeObserver.observe(node))
}

const dropRefs = ref<Record<string, ComponentPublicInstance<typeof OcDrop>>>({})
const searchAndReplaceActionId = 'menu-search-and-replace'

function setDropRef(itemId: string, el: ComponentPublicInstance<typeof OcDrop>) {
  dropRefs.value[itemId] = el
}

function findActionById(actionId: string) {
  return unref(allActions).find((action) => action.id === actionId)
}

async function openSearchAndReplaceMenu() {
  const action = findActionById(searchAndReplaceActionId)
  if (!action || !isEditorActionEnabled(action, unref(textEditor.editor), unref(sourceMode))) {
    return
  }

  const isInOverflowMenu = !unref(visibleItemIds).includes(searchAndReplaceActionId)
  const idPrefix = isInOverflowMenu ? 'toolbar-overflow' : 'toolbar'

  if (isInOverflowMenu) {
    await unref(overflowDropRef)?.show?.({ noFocus: true })
    await nextTick()
  }

  const dropRef = dropRefs.value[searchAndReplaceActionId]
  if (!dropRef?.show) {
    return
  }

  const triggerEl = document.getElementById(`${idPrefix}-dropdown-trigger-${action.id}`)
  await dropRef.show({ anchorElement: triggerEl ?? undefined })
}

function handleSearchShortcut(event: KeyboardEvent) {
  if (!unref(textEditor.isFocused)) {
    return
  }
  event.preventDefault()
  openSearchAndReplaceMenu()
}

onMounted(async () => {
  await nextTick()

  resizeObserver = new ResizeObserver(() => scheduleMeasure())
  observeItems()
  measure()

  if (unref(isSearchAndReplaceAvailable)) {
    const searchShortcutId = bindKeyAction(
      { modifier: Modifier.Ctrl, primary: Key.F },
      handleSearchShortcut,
      { preventDefault: false }
    )
    keyActionIds.push(searchShortcutId)
  }
})

onUpdated(() => observeItems())

// the overflow drop unmounts without emitting `hide-drop`, so reset the state manually
watch(hasOverflow, (value) => {
  if (!value) {
    isOverflowMenuOpen.value = false
  }
})

watch(toolbarGroups, async () => {
  await nextTick()
  measure()
})

const visible = computed(() => {
  if (unref(textEditor.readonly)) {
    return false
  }
  return !!unref(textEditor.editor)
})

const yjsStatus = computed(() => unref(textEditor.yjsStatus))
const collaborators = computed(() => unref(textEditor.collaborators) ?? [])

const showCollaborationStatusIndicator = computed(() => {
  const status = unref(textEditor.yjsStatus)
  return status !== YjsStatus.Local && status !== null
})

const collaborationStatusLabel = computed(() => {
  if (unref(textEditor.yjsStatus) === YjsStatus.Connected) {
    return $gettext('Collaboration ready')
  }
  if (unref(textEditor.yjsStatus) === YjsStatus.Disconnected) {
    return $gettext('Collaboration disconnected')
  }
  if (unref(textEditor.yjsStatus) === YjsStatus.Connecting) {
    return $gettext('Collaboration connecting...')
  }
  return ''
})

const collaborationStatusIcon = computed(() => {
  if (unref(textEditor.yjsStatus) === YjsStatus.Disconnected) {
    return 'wifi-off'
  }
  return 'wifi'
})

const collaborationStatusClasses = computed(() => {
  if (unref(textEditor.yjsStatus) === YjsStatus.Connected) {
    return 'border-green-700/20 bg-green-500/15 text-green-700'
  }
  if (unref(textEditor.yjsStatus) === YjsStatus.Disconnected) {
    return 'border-red-700/20 bg-red-500/15 text-red-700'
  }
  if (unref(textEditor.yjsStatus) === YjsStatus.Connecting) {
    return 'border-gray-700/20 bg-gray-500/15 text-gray-700'
  }
  return ''
})

const { bindKeyAction, removeKeyAction } = useKeyboardActions({
  skipDisabledKeyBindingsCheck: true
})

const isSearchAndReplaceAvailable = computed(() => {
  return unref(allActions).some((action) => action.id === searchAndReplaceActionId)
})

onBeforeUnmount(() => {
  if (measureFrame !== undefined) {
    cancelAnimationFrame(measureFrame)
  }
  resizeObserver?.disconnect()
  keyActionIds.forEach((id) => removeKeyAction(id))
})
</script>
