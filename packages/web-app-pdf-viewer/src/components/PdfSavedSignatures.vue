<template>
  <oc-list ref="list" class="pdf-viewer-saved-signatures">
    <li
      v-for="({ signature, viewBox, path }, index) in previews"
      :key="signature.uuid"
      class="pdf-viewer-saved-signature flex items-center gap-1"
    >
      <oc-button
        class="min-w-0 flex-1 p-0 pr-2"
        :aria-label="
          $gettext('Saved signature: %{description}', { description: signature.description })
        "
        appearance="raw-inverse"
        color-role="surface"
        justify-content="left"
        gap-size="none"
        @click="emit('add', signature)"
      >
        <svg
          class="h-10 w-24 shrink-0 rounded bg-role-surface-container p-1"
          :viewBox="viewBox"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <path
            :d="path"
            class="stroke-current"
            :class="signature.areContours ? 'fill-current' : 'fill-none'"
            :stroke-width="signature.areContours ? 0.5 : 1"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <span class="truncate pl-1" :title="signature.description" v-text="signature.description" />
      </oc-button>
      <oc-button
        v-oc-tooltip="$gettext('Remove saved signature')"
        class="pdf-viewer-remove-signature w-auto! shrink-0 p-2"
        :aria-label="
          $gettext('Remove saved signature: %{description}', {
            description: signature.description
          })
        "
        appearance="raw-inverse"
        color-role="surface"
        gap-size="none"
        @click="remove(signature.uuid, index)"
      >
        <oc-icon name="delete-bin" fill-type="line" size-class="size-4" />
      </oc-button>
    </li>
    <pdf-menu-item
      v-if="hasAddNew"
      class="pdf-viewer-add-signature"
      :label="$gettext('Add new signature')"
      icon="add"
      @click="emit('addNew')"
    />
  </oc-list>
</template>

<script setup lang="ts">
import { computed, unref, useTemplateRef, watch } from 'vue'
import { SignatureExtractor } from 'pdfjs-dist'
import type { OcList } from '@opencloud-eu/design-system/components'
import type { SavedSignature } from '../composables/usePdfSignatureStorage'
import PdfMenuItem from './PdfMenuItem.vue'

const { signatures, hasAddNew = true } = defineProps<{
  signatures: SavedSignature[]
  /** False where adding a new signature is offered elsewhere. */
  hasAddNew?: boolean
}>()

const emit = defineEmits<{
  add: [signature: SavedSignature]
  remove: [uuid: string]
  addNew: []
}>()

const list = useTemplateRef<InstanceType<typeof OcList>>('list')
let removedIndex: number | undefined

function remove(uuid: string, index: number) {
  removedIndex = index
  emit('remove', uuid)
}

// The focus was on the removed entry, it moves to the next one (or the one before, or "Add new").
watch(
  () => signatures,
  () => {
    if (removedIndex === undefined) {
      return
    }
    const element: HTMLElement = unref(list).$el
    const buttons = element.querySelectorAll<HTMLElement>('.pdf-viewer-remove-signature')
    const button = buttons[Math.min(removedIndex, buttons.length - 1)]
    removedIndex = undefined
    ;(button ?? element.querySelector<HTMLElement>('.pdf-viewer-add-signature'))?.focus()
  },
  { flush: 'post' }
)

// The outline of each signature as an SVG path, the same way the PDF.js viewer draws them.
const previews = computed(() =>
  signatures.flatMap((signature) => {
    const { lines, areContours } = signature
    const maxDim = Math.max(lines.width, lines.height)
    const outline = SignatureExtractor.processDrawnLines({
      lines,
      pageWidth: maxDim,
      pageHeight: maxDim,
      rotation: 0,
      innerMargin: 0,
      mustSmooth: false,
      areContours
    })?.outline
    return outline ? [{ signature, viewBox: outline.viewBox, path: outline.toSVGPath() }] : []
  })
)
</script>
