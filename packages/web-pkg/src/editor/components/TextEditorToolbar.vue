<template>
  <div v-if="visible" class="text-editor-toolbar relative border-b border-b-role-border py-1">
    <div
      ref="scrollContainer"
      class="flex items-center gap-1 overflow-x-auto before:grow after:grow"
      @scroll="updateScrollState"
    >
      <div
        v-for="(group, groupIndex) in toolbarGroups"
        :key="`toolbar-group-${group.id}`"
        class="text-editor-toolbar-group inline-flex items-stretch"
        :class="{ 'border-l border-l-role-border pl-1': groupIndex > 0 }"
      >
        <template v-for="item in group.actions" :key="`toolbar-item-${item.id}`">
          <template v-if="item.childActions || item.menuComponent">
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
              :disabled="!isItemEnabled(item)"
              @mousedown.prevent
              @click.stop
            >
              <oc-icon
                :name="getActiveIcon(item).icon"
                :fill-type="getActiveIcon(item).iconFillType || 'none'"
                size-class="size-4"
              />
              <oc-icon name="arrow-down-s" fill-type="line" size-class="size-4" />
            </oc-button>
            <oc-drop
              :ref="
                (el) => setDropRef(item.id, el as ComponentPublicInstance<typeof OcDrop> | null)
              "
              :drop-id="`toolbar-dropdown-${item.id}`"
              :toggle="`#toolbar-dropdown-trigger-${item.id}`"
              :teleport="teleport"
              mode="click"
              class="text-editor-toolbar-dropdown w-auto min-w-40"
              padding-size="small"
              :close-on-click="item.menuCloseOnClick ?? true"
            >
              <component
                :is="item.menuComponent"
                v-if="item.menuComponent"
                v-bind="getMenuComponentAttrs(item)"
              />
              <ul v-else class="oc-list">
                <li
                  v-for="child in item.childActions"
                  :key="`${item.id}-${child.id}`"
                  class="oc-rounded oc-menu-item-hover"
                >
                  <oc-button
                    v-if="child.menuComponent"
                    :id="`toolbar-dropdown-trigger-${child.id}`"
                    appearance="raw-inverse"
                    color-role="surface"
                    justify-content="space-between"
                    class="p-1"
                    :disabled="!isItemEnabled(child)"
                    @mousedown.prevent
                    @click.stop
                  >
                    <span class="inline-flex items-center gap-2">
                      <oc-icon
                        :name="child.icon"
                        :fill-type="child.iconFillType || 'none'"
                        size-class="size-4"
                      />
                      <span>{{ child.title }}</span>
                    </span>
                    <oc-icon name="arrow-right-s" fill-type="line" size-class="size-4" />
                  </oc-button>
                  <oc-button
                    v-else
                    :appearance="isItemActive(child) ? 'filled' : 'raw-inverse'"
                    :color-role="isItemActive(child) ? 'secondaryContainer' : 'surface'"
                    :no-hover="isItemActive(child)"
                    justify-content="space-between"
                    class="p-1"
                    :disabled="!isItemEnabled(child)"
                    @mousedown.prevent
                    @click="child.toolbarAction?.(textEditor.editor.value!)"
                  >
                    <span class="inline-flex items-center gap-2">
                      <span
                        v-if="child.swatchColor"
                        class="inline-block size-4 rounded-full border-2 border-role-outline-variant"
                        :style="{ backgroundColor: child.swatchColor }"
                      />
                      <oc-icon
                        v-else
                        :name="child.icon"
                        :fill-type="child.iconFillType || 'none'"
                        size-class="size-4"
                      />
                      <span>{{ child.title }}</span>
                    </span>
                    <oc-icon
                      v-if="isItemActive(child)"
                      name="check"
                      fill-type="line"
                      size-class="size-4"
                    />
                  </oc-button>
                  <oc-drop
                    v-if="child.menuComponent"
                    :ref="
                      (el) =>
                        setDropRef(child.id, el as ComponentPublicInstance<typeof OcDrop> | null)
                    "
                    :drop-id="`toolbar-dropdown-${child.id}`"
                    :toggle="`#toolbar-dropdown-trigger-${child.id}`"
                    mode="hover"
                    class="text-editor-toolbar-dropdown-nested w-fit"
                    :close-on-click="child.menuCloseOnClick ?? true"
                    position="right-start"
                    teleport="body"
                  >
                    <component :is="child.menuComponent" v-bind="getMenuComponentAttrs(child)" />
                  </oc-drop>
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
            <oc-icon
              :name="item.icon"
              :fill-type="item.iconFillType || 'none'"
              size-class="size-4"
            />
          </oc-button>
        </template>
      </div>
      <div
        v-if="showCollaborationStatusIndicator"
        v-oc-tooltip="collaborationStatusLabel"
        class="text-editor-toolbar-collaboration-status ml-2 inline-flex shrink-0 items-center"
        :aria-label="collaborationStatusLabel"
      >
        <span
          class="inline-flex size-5 items-center justify-center rounded-full border"
          :class="collaborationStatusClasses"
        >
          <oc-icon :name="collaborationStatusIcon" fill-type="line" size-class="size-3" />
        </span>
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
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { TextEditorInstance } from '../types'
import type { EditorAction, EditorActionGroup } from '../composables'
import { OcDrop } from '@opencloud-eu/design-system/components'
import { Key, Modifier, useKeyboardActions } from '../../composables/keyboardActions'
import { YjsStatus } from '../../composables/yjs'

const { actionsToDisplay = undefined, teleport = undefined } = defineProps<{
  actionsToDisplay?: string[]
  teleport?: string
}>()

const textEditor = inject<TextEditorInstance>('textEditor')!
const { $gettext } = useGettext()

const scrollContainerRef = useTemplateRef('scrollContainer')
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const keyActionIds: string[] = []

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

const dropRefs = ref<Record<string, ComponentPublicInstance<typeof OcDrop>>>({})
const searchAndReplaceActionId = 'menu-search-and-replace'

function setDropRef(itemId: string, el: ComponentPublicInstance<typeof OcDrop> | null) {
  if (el) {
    dropRefs.value[itemId] = el
  }
}

const findActionById = (actionId: string) => {
  return unref(toolbarGroups)
    .flatMap((group) => group.actions)
    .find((action) => action.id === actionId)
}

const openSearchAndReplaceMenu = async () => {
  const action = findActionById(searchAndReplaceActionId)
  if (!action || !isItemEnabled(action)) {
    return
  }

  const dropRef = dropRefs.value[searchAndReplaceActionId]
  if (!dropRef?.show) {
    return
  }

  const triggerEl = document.getElementById(`toolbar-dropdown-trigger-${searchAndReplaceActionId}`)
  await dropRef.show({ anchorElement: triggerEl ?? undefined })
}

const handleSearchShortcut = (event: KeyboardEvent) => {
  if (!unref(textEditor.isFocused)) {
    return
  }
  event.preventDefault()
  openSearchAndReplaceMenu()
}

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

  if (unref(isSearchAndReplaceAvailable)) {
    const searchShortcutId = bindKeyAction(
      { modifier: Modifier.Ctrl, primary: Key.F },
      handleSearchShortcut,
      { preventDefault: false }
    )
    keyActionIds.push(searchShortcutId)
  }
})

watch(toolbarGroups, async () => {
  await nextTick()
  updateScrollState()
})

const visible = computed(() => {
  if (unref(textEditor.readonly)) {
    return false
  }
  return !!unref(textEditor.editor)
})

const showCollaborationStatusIndicator = computed(
  () =>
    unref(textEditor.yjsStatus) === YjsStatus.Connected ||
    unref(textEditor.yjsStatus) === YjsStatus.Disconnected
)

const collaborationStatusLabel = computed(() => {
  if (unref(textEditor.yjsStatus) === YjsStatus.Connected) {
    return $gettext('Collaboration ready')
  }
  if (unref(textEditor.yjsStatus) === YjsStatus.Disconnected) {
    return $gettext('Collaboration disconnected')
  }
  return ''
})

const collaborationStatusIcon = computed(() =>
  unref(textEditor.yjsStatus) === YjsStatus.Disconnected ? 'wifi-off' : 'wifi'
)

const collaborationStatusClasses = computed(() => {
  if (unref(textEditor.yjsStatus) === YjsStatus.Connected) {
    return 'border-green-700/20 bg-green-500/15 text-green-700'
  }
  if (unref(textEditor.yjsStatus) === YjsStatus.Disconnected) {
    return 'border-red-700/20 bg-red-500/15 text-red-700'
  }
  return ''
})

const isSourceMode = computed(() => unref(textEditor.state.sourceMode))
const sourceModeEnabledActionIds = ['source-mode', 'menu-zoom', 'zoom-in', 'zoom-out', 'zoom-reset']

const isItemEnabled = (item: EditorAction) => {
  if (unref(isSourceMode) && !sourceModeEnabledActionIds.includes(item.id)) {
    return false
  }

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
  const editor = unref(textEditor.editor)
  if (editor && item.activeIcon) {
    const active = item.activeIcon(editor)
    if (active) {
      return active
    }
  }
  return { icon: item.icon, iconFillType: item.iconFillType }
}

const getMenuComponentAttrs = (item: EditorAction) => {
  const editor = unref(textEditor.editor)
  if (!editor || !item.menuComponentAttrs) {
    return {}
  }

  const closeMenu = () => {
    const dropRef = dropRefs.value[item.id]
    if (dropRef?.hide) {
      dropRef.hide()
    }
  }

  return item.menuComponentAttrs(editor, closeMenu)
}

const { bindKeyAction, removeKeyAction } = useKeyboardActions({
  skipDisabledKeyBindingsCheck: true
})

const isSearchAndReplaceAvailable = computed(() => {
  return unref(toolbarGroups)
    .flatMap((group) => group.actions)
    .some((action) => action.id === searchAndReplaceActionId)
})

onBeforeUnmount(() => {
  keyActionIds.forEach((id) => removeKeyAction(id))
})
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
