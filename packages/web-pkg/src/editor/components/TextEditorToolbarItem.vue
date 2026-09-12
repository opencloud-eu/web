<template>
  <template v-if="item.childActions || item.menuComponent">
    <oc-button
      :id="triggerId"
      v-oc-tooltip="item.title"
      type="button"
      appearance="raw"
      class="text-editor-toolbar-btn min-w-[52px] inline-flex items-center justify-center p-2"
      :class="rootClasses"
      :aria-label="item.title"
      :aria-hidden="measureOnly"
      :tabindex="measureOnly ? -1 : undefined"
      :data-item-id="item.id"
      :disabled="!isItemEnabled(item)"
      gap-size="none"
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
      v-if="!measureOnly"
      :ref="(el) => registerDrop(item.id, el as ComponentPublicInstance<typeof OcDrop> | null)"
      :drop-id="`${idPrefix}-dropdown-${item.id}`"
      :toggle="`#${triggerId}`"
      :teleport="teleport"
      mode="click"
      class="text-editor-toolbar-dropdown w-auto min-w-40"
      padding-size="small"
      :close-on-click="item.menuCloseOnClick ?? true"
      :enforce-drop-on-mobile="item.menuEnforceDropOnMobile ?? false"
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
            :id="`${idPrefix}-dropdown-trigger-${child.id}`"
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
            <oc-icon v-if="isItemActive(child)" name="check" fill-type="line" size-class="size-4" />
          </oc-button>
          <oc-drop
            v-if="child.menuComponent"
            :ref="
              (el) => registerDrop(child.id, el as ComponentPublicInstance<typeof OcDrop> | null)
            "
            :drop-id="`${idPrefix}-dropdown-${child.id}`"
            :toggle="`#${idPrefix}-dropdown-trigger-${child.id}`"
            mode="hover"
            class="text-editor-toolbar-dropdown-nested w-fit"
            :close-on-click="child.menuCloseOnClick ?? true"
            :enforce-drop-on-mobile="item.menuEnforceDropOnMobile ?? false"
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
    :class="rootClasses"
    :aria-label="item.title"
    :aria-hidden="measureOnly"
    :tabindex="measureOnly ? -1 : undefined"
    :data-item-id="item.id"
    :disabled="!isItemEnabled(item)"
    @click.stop="onActionClick"
  >
    <oc-icon :name="item.icon" :fill-type="item.iconFillType || 'none'" size-class="size-4" />
  </oc-button>
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { OcDrop } from '@opencloud-eu/design-system/components'
import type { TextEditorInstance } from '../types'
import type { EditorAction } from '../composables'
import { isEditorActionEnabled } from '../helpers'

const {
  item,
  idPrefix = 'toolbar',
  teleport = undefined,
  measureOnly = false
} = defineProps<{
  item: EditorAction
  idPrefix?: string
  teleport?: string
  /**
   * Renders the trigger button only, taken out of the layout flow. Used to measure the natural
   * width of actions that currently live in the overflow menu.
   */
  measureOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'registerDrop', itemId: string, el: ComponentPublicInstance<typeof OcDrop>): void
  (e: 'actionClick'): void
}>()

const textEditor = inject<TextEditorInstance>('textEditor')!

const triggerId = computed(() => `${idPrefix}-dropdown-trigger-${item.id}`)

const rootClasses = computed(() => ({
  'bg-role-secondary-container': isItemActive(item),
  'absolute left-0 top-0 invisible pointer-events-none': measureOnly
}))

const dropRefs: Record<string, ComponentPublicInstance<typeof OcDrop>> = {}

function onActionClick() {
  item.toolbarAction?.(unref(textEditor.editor)!)
  emit('actionClick')
}

function registerDrop(itemId: string, el: ComponentPublicInstance<typeof OcDrop> | null) {
  if (!el) {
    return
  }
  dropRefs[itemId] = el
  emit('registerDrop', itemId, el)
}

function isItemEnabled(action: EditorAction) {
  return isEditorActionEnabled(action, unref(textEditor.editor), unref(textEditor.state.sourceMode))
}

function isItemActive(action: EditorAction) {
  const editor = unref(textEditor.editor)
  if (!editor) {
    return false
  }

  if (action.isActive) {
    return action.isActive(editor)
  }
  return false
}

function getActiveIcon(action: EditorAction) {
  const editor = unref(textEditor.editor)
  if (editor && action.activeIcon) {
    const active = action.activeIcon(editor)
    if (active) {
      return active
    }
  }
  return { icon: action.icon, iconFillType: action.iconFillType }
}

function getMenuComponentAttrs(action: EditorAction) {
  const editor = unref(textEditor.editor)
  if (!editor || !action.menuComponentAttrs) {
    return {}
  }

  const closeMenu = () => {
    dropRefs[action.id]?.hide?.({ includeAncestors: true })
  }

  return action.menuComponentAttrs(editor, closeMenu)
}
</script>
