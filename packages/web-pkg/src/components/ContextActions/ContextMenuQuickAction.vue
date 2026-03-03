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
    ref="drop"
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
import { ComponentPublicInstance, computed, useTemplateRef } from 'vue'
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
const drop = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('drop')
defineExpose({ drop })

const contextMenuLabel = computed(() => $gettext('Show context menu'))
</script>
