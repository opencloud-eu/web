<template>
  <oc-button
    :id="`context-menu-trigger-${resourceDomSelector(item)}`"
    v-oc-tooltip="contextMenuLabel"
    :data-test-context-menu-resource-name="item.name"
    :aria-label="contextMenuLabel"
    appearance="raw"
    class="quick-action-button ml-1 p-1"
    :class="$attrs.class"
    @click="$emit('quickActionClicked', $event)"
  >
    <oc-icon name="more-2" />
  </oc-button>
  <oc-drop
    ref="dropRef"
    :drop-id="`context-menu-drop-${resourceDomSelector(item)}`"
    :toggle="`#context-menu-trigger-${resourceDomSelector(item)}`"
    :title="title"
    position="left-start"
    mode="manual"
    padding-size="small"
    close-on-click
  >
    <slot name="contextMenu" :item="item" />
  </oc-drop>
</template>

<script setup lang="ts">
import { ComponentPublicInstance, computed, unref, useTemplateRef } from 'vue'
import { extractDomSelector, Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { OcDrop } from '@opencloud-eu/design-system/components'

const {
  item,
  resourceDomSelector = (resource: Resource) => extractDomSelector(resource.id),
  title = ''
} = defineProps<{
  item: Resource
  resourceDomSelector?: (resource: Resource) => string
  title?: string
}>()

defineEmits<{
  (e: 'quickActionClicked', event: MouseEvent | KeyboardEvent): void
}>()

const { $gettext } = useGettext()
const dropRef = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('dropRef')

// Consumers capture this exposed `drop` inside a function ref (e.g. ResourceTable's
// `:ref="(el) => (contextMenuDrops[item.id] = el?.drop)"`), which runs at render time.
// At that point the inner `dropRef` template ref is not yet populated (it's assigned in a
// post-render effect). Since vue 3.5.39 pauses reactive tracking while invoking function
// refs, that initial `null` capture is never re-run once `dropRef` populates, leaving the
// context menu broken until an unrelated re-render. To stay robust regardless of timing we
// expose a stable wrapper that resolves the inner drop lazily on each call.
const drop = {
  show: (...args: Parameters<ComponentPublicInstance<typeof OcDrop>['show']>) =>
    unref(dropRef)?.show(...args),
  hide: (...args: Parameters<ComponentPublicInstance<typeof OcDrop>['hide']>) =>
    unref(dropRef)?.hide(...args),
  update: (...args: Parameters<ComponentPublicInstance<typeof OcDrop>['update']>) =>
    unref(dropRef)?.update(...args)
} as unknown as ComponentPublicInstance<typeof OcDrop>
defineExpose({ drop })

const contextMenuLabel = computed(() => $gettext('Show context menu'))
</script>
