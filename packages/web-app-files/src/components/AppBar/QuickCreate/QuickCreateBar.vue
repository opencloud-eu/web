<template>
  <div
    v-if="actions.length"
    ref="container"
    class="quick-create-bar flex w-full items-stretch gap-2 py-1"
  >
    <quick-create-item
      v-for="action in visibleActions"
      :key="getKey(action)"
      :action="action"
      :space="space"
      :icon-only="iconOnly"
      :class="iconOnly ? 'w-20' : 'w-56'"
    />
    <template v-if="overflowActions.length">
      <oc-button
        id="quick-create-more-btn"
        v-oc-tooltip="$gettext('More')"
        :aria-label="$gettext('More')"
        class="w-9 shrink-0 self-stretch outline-role-outline-variant"
        appearance="outline"
      >
        <oc-icon name="more-2" fill-type="line" />
      </oc-button>
      <oc-drop
        drop-id="quick-create-more-drop"
        toggle="#quick-create-more-btn"
        mode="click"
        close-on-click
        padding-size="small"
      >
        <oc-list>
          <li v-for="action in overflowActions" :key="getKey(action)">
            <quick-create-item :action="action" :space="space" appearance="raw" />
          </li>
        </oc-list>
      </oc-drop>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useElementSize } from '@vueuse/core'
import { SpaceResource } from '@opencloud-eu/web-client'
import { FileAction, useFileActions, useResourcesStore } from '@opencloud-eu/web-pkg'
import { quickCreateExtensionPoint } from '../../../extensionPoints'
import QuickCreateItem from './QuickCreateItem.vue'

const { space } = defineProps<{
  space: SpaceResource
}>()

// rem values matching the tailwind classes used in the template
const LABEL_ITEM_WIDTH_REM = 14
const ICON_ITEM_WIDTH_REM = 5
const MORE_BUTTON_WIDTH_REM = 2.25
const GAP_REM = 0.5
const ICON_ONLY_BREAKPOINT_REM = 40

const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
function toPx(rem: number) {
  return rem * rootFontSize
}

const { getExtensionActions } = useFileActions()
const { currentFolder } = storeToRefs(useResourcesStore())

const container = useTemplateRef('container')
const { width } = useElementSize(container)

// app file types first, then custom actions, external app provider types last
function getSortOrder(action: FileAction) {
  if (action.name !== 'create-new-file') {
    return 1
  }
  return action.isExternal ? 2 : 0
}

const availableActions = computed(() =>
  getExtensionActions(quickCreateExtensionPoint.id)
    .filter((action) => action.isVisible({ space }))
    .sort((a, b) => getSortOrder(a) - getSortOrder(b))
)

// the folder loader clears the current folder on navigation, which hides all actions until
// the next folder is loaded. keep the previous actions meanwhile to avoid flickering.
const actions = ref<FileAction[]>([])
watch(
  [availableActions, currentFolder],
  ([available, folder]) => {
    if (folder) {
      actions.value = available
    }
  },
  { immediate: true }
)

const iconOnly = computed(() => unref(width) > 0 && unref(width) < toPx(ICON_ONLY_BREAKPOINT_REM))

const visibleCount = computed(() => {
  const count = unref(actions).length
  // not measured yet
  if (!unref(width)) {
    return count
  }
  const itemWidth = toPx(unref(iconOnly) ? ICON_ITEM_WIDTH_REM : LABEL_ITEM_WIDTH_REM)
  const gap = toPx(GAP_REM)
  const fitting = Math.floor((unref(width) + gap) / (itemWidth + gap))
  if (count <= fitting) {
    return count
  }
  // reserve space for the "more" button
  const remaining = unref(width) - toPx(MORE_BUTTON_WIDTH_REM) - gap
  return Math.max(0, Math.floor((remaining + gap) / (itemWidth + gap)))
})

const visibleActions = computed(() => unref(actions).slice(0, unref(visibleCount)))
const overflowActions = computed(() => unref(actions).slice(unref(visibleCount)))

function getKey(action: FileAction) {
  return `${action.name}-${action.ext || action.id || action.label({ space })}`
}
</script>
