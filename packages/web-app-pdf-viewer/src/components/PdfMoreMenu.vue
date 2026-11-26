<template>
  <pdf-toolbar-button
    id="pdf-viewer-more-toggle"
    ref="toggle"
    :label="$gettext('More actions')"
    icon="more"
    class="pdf-viewer-more"
  />
  <oc-drop
    drop-id="pdf-viewer-more-drop"
    toggle="#pdf-viewer-more-toggle"
    :title="$gettext('More actions')"
    mode="click"
    padding-size="small"
    class="w-auto min-w-56"
    close-on-click
  >
    <div
      v-for="(group, index) in groups"
      :key="group.id"
      :class="{ 'mt-2 border-t border-role-border pt-2': index > 0 }"
    >
      <oc-list :aria-label="group.label">
        <pdf-menu-item
          v-for="item in group.items"
          :key="item.id"
          :class="group.optionClass ?? `pdf-viewer-more-${item.id}`"
          :data-mode="item.mode"
          :label="item.label"
          :icon="item.icon"
          :fill-type="item.fillType"
          :is-active="item.isActive"
          :disabled="item.isDisabled"
          @click="item.handler"
        />
      </oc-list>
    </div>
    <oc-list class="mt-2 border-t border-role-border pt-2">
      <pdf-menu-item
        class="pdf-viewer-more-properties"
        :label="$gettext('Document properties')"
        icon="file-info"
        @click="showProperties"
      />
    </oc-list>
  </oc-drop>
</template>

<script setup lang="ts">
import { unref, useTemplateRef } from 'vue'
import {
  usePdfMoreMenu,
  type MoreMenuEvents,
  type MoreMenuProps
} from '../composables/usePdfMoreMenu'
import PdfToolbarButton from './PdfToolbarButton.vue'
import PdfMenuItem from './PdfMenuItem.vue'

const props = withDefaults(defineProps<MoreMenuProps>(), { canZoomIn: true, canZoomOut: true })

const emit = defineEmits<MoreMenuEvents & { showProperties: [] }>()

const { groups } = usePdfMoreMenu(props, emit)

const toggle = useTemplateRef<InstanceType<typeof PdfToolbarButton>>('toggle')

// The dialog returns the focus to where it was when it opened, the menu is gone by then.
function showProperties() {
  unref(toggle)?.$el.focus()
  emit('showProperties')
}
</script>
