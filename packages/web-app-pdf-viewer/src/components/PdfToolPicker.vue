<template>
  <pdf-toolbar-button
    id="pdf-viewer-tool-picker-toggle"
    :label="toggleLabel"
    :icon="activeTool?.icon ?? 'pencil-ruler-2'"
    :fill-type="activeTool?.fillType ?? 'line'"
    :is-active="!!activeTool"
    :disabled="disabled"
    has-dropdown
    class="pdf-viewer-tool-picker"
    @pointerdown="emit('openSettings')"
  />
  <oc-drop
    ref="drop"
    drop-id="pdf-viewer-tool-picker"
    toggle="#pdf-viewer-tool-picker-toggle"
    :title="$gettext('Annotation tools')"
    mode="click"
    padding-size="small"
    :close-on-click="false"
    :is-menu="false"
    class="w-64"
  >
    <oc-list>
      <template v-for="tool in tools" :key="tool.id">
        <pdf-menu-item
          v-if="tool.id !== 'stamp'"
          :class="[
            `pdf-viewer-tool-picker-${tool.id}`,
            { 'rounded-b-none!': tool.settings && tool.mode === editorMode }
          ]"
          :label="tool.label"
          :icon="tool.icon"
          :fill-type="tool.fillType"
          :is-active="tool.mode === editorMode"
          @click="selectTool(tool.mode)"
        />
        <li
          v-if="tool.settings && tool.mode === editorMode"
          class="pdf-viewer-tool-picker-settings -mt-1 mb-1 rounded-b-sm border-4 border-t-0 border-role-secondary-container p-3"
        >
          <pdf-tool-settings
            role="group"
            :aria-label="tool.settingsLabel"
            :settings="tool.settings"
            :values="getValues(tool.settings)"
            @update="(type, value) => emit('updateParam', tool.mode, type, value)"
          />
        </li>
      </template>
    </oc-list>
    <div :class="sectionClass">
      <p :class="headingClass" v-text="imageTool.label" />
      <oc-list>
        <pdf-menu-item
          v-for="source in imageSources"
          :key="source.id"
          :class="`pdf-viewer-tool-picker-image-${source.id}`"
          :label="source.label"
          :icon="source.icon"
          @click="addImage(source.id)"
        />
      </oc-list>
    </div>
    <div v-if="savedSignatures.length" :class="sectionClass">
      <p :class="headingClass" v-text="$gettext('Saved signatures')" />
      <pdf-saved-signatures
        :signatures="savedSignatures"
        :has-add-new="false"
        @add="addSavedSignature"
        @remove="(uuid) => emit('removeSavedSignature', uuid)"
      />
    </div>
  </oc-drop>
</template>

<script setup lang="ts">
import { computed, unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  usePdfAnnotationTools,
  type AnnotationToolsEmits,
  type AnnotationToolsProps
} from '../composables/usePdfAnnotationTools'
import type { SavedSignature } from '../composables/usePdfSignatureStorage'
import PdfToolbarButton from './PdfToolbarButton.vue'
import PdfMenuItem from './PdfMenuItem.vue'
import PdfToolSettings from './PdfToolSettings.vue'
import PdfSavedSignatures from './PdfSavedSignatures.vue'

const {
  editorMode,
  params = new Map(),
  savedSignatures = [],
  disabled = false
} = defineProps<AnnotationToolsProps>()

const emit = defineEmits<AnnotationToolsEmits>()

const { $gettext } = useGettext()

const { tools, imageSources, getValues } = usePdfAnnotationTools({ params: () => params })

const sectionClass = 'mt-2 border-t border-role-border pt-2'
const headingClass = 'px-2 pb-1 text-xs text-role-on-surface-variant'

const drop = useTemplateRef<{ hide(): void }>('drop')

const imageTool = computed(() => unref(tools).find(({ id }) => id === 'stamp'))
const activeTool = computed(() => unref(tools).find(({ mode }) => mode === editorMode))

// It opens the drop (expanded state), it isn't a toggle of the tool, which it names instead.
const toggleLabel = computed(() =>
  unref(activeTool)
    ? $gettext('Annotation tools: %{tool}', { tool: unref(activeTool).label })
    : $gettext('Annotation tools')
)

// The drop closes right away, the tool is used on the page.
function selectTool(mode: number) {
  unref(drop)?.hide()
  emit('selectTool', mode)
}

function addImage(source: 'device' | 'cloud') {
  unref(drop)?.hide()
  emit('addImage', source)
}

function addSavedSignature(signature: SavedSignature) {
  unref(drop)?.hide()
  emit('addSavedSignature', signature)
}
</script>
