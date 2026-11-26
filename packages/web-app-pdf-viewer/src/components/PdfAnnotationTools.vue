<template>
  <div class="pdf-viewer-annotation-tools inline-flex items-stretch gap-1">
    <template v-for="tool in tools" :key="tool.id">
      <pdf-split-tool-button
        v-if="tool.id === 'signature'"
        v-slot="{ hide }"
        :tool="tool"
        :drop-title="$gettext('Saved signatures')"
        :is-active="editorMode === tool.mode"
        :disabled="disabled"
        padding-size="small"
        drop-width-class="w-80"
        @select="emit('selectTool', tool.mode)"
      >
        <pdf-saved-signatures
          :signatures="savedSignatures"
          @add="(signature) => addSavedSignature(signature, hide)"
          @remove="(uuid) => emit('removeSavedSignature', uuid)"
          @add-new="addNewSignature(tool.mode, hide)"
        />
      </pdf-split-tool-button>
      <pdf-split-tool-button
        v-else-if="tool.settings"
        :tool="tool"
        :drop-title="tool.settingsLabel"
        :is-active="editorMode === tool.mode"
        :disabled="disabled"
        :is-drop-disabled="editorMode !== tool.mode"
        :is-menu="false"
        @select="emit('selectTool', tool.mode)"
        @open-drop="emit('openSettings')"
      >
        <pdf-tool-settings
          :settings="tool.settings"
          :values="getValues(tool.settings)"
          @update="(type, value) => emit('updateParam', tool.mode, type, value)"
        />
      </pdf-split-tool-button>
      <template v-else-if="tool.id === 'stamp'">
        <pdf-toolbar-button
          id="pdf-viewer-image-toggle"
          :label="tool.label"
          :icon="tool.icon"
          has-dropdown
          :is-active="editorMode === tool.mode"
          :disabled="disabled"
          class="pdf-viewer-tool pdf-viewer-tool-stamp"
        />
        <oc-drop
          drop-id="pdf-viewer-image-drop"
          toggle="#pdf-viewer-image-toggle"
          mode="click"
          padding-size="small"
          class="w-auto min-w-44"
          close-on-click
        >
          <oc-list>
            <pdf-menu-item
              v-for="source in imageSources"
              :key="source.id"
              :class="`pdf-viewer-add-image-${source.id}`"
              :label="source.label"
              :icon="source.icon"
              @click="emit('addImage', source.id)"
            />
          </oc-list>
        </oc-drop>
      </template>
      <pdf-toolbar-button
        v-else
        :id="`pdf-viewer-${tool.id}-toggle`"
        :label="tool.label"
        :icon="tool.icon"
        :is-active="editorMode === tool.mode"
        :disabled="disabled"
        :class="['pdf-viewer-tool', `pdf-viewer-tool-${tool.id}`]"
        @click="emit('selectTool', tool.mode)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  usePdfAnnotationTools,
  type AnnotationToolsEmits,
  type AnnotationToolsProps
} from '../composables/usePdfAnnotationTools'
import type { SavedSignature } from '../composables/usePdfSignatureStorage'
import PdfToolbarButton from './PdfToolbarButton.vue'
import PdfSplitToolButton from './PdfSplitToolButton.vue'
import PdfToolSettings from './PdfToolSettings.vue'
import PdfMenuItem from './PdfMenuItem.vue'
import PdfSavedSignatures from './PdfSavedSignatures.vue'

const {
  editorMode,
  params = new Map(),
  savedSignatures = [],
  disabled = false
} = defineProps<AnnotationToolsProps>()

const emit = defineEmits<AnnotationToolsEmits>()

const { tools, imageSources, getValues } = usePdfAnnotationTools({ params: () => params })

function addSavedSignature(signature: SavedSignature, hideDrop: () => void) {
  hideDrop()
  emit('addSavedSignature', signature)
}

function addNewSignature(mode: number, hideDrop: () => void) {
  hideDrop()
  emit('selectTool', mode)
}
</script>
