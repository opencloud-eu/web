<template>
  <div class="relative min-h-0 flex-1">
    <p
      v-if="!curves && !stroke"
      class="pointer-events-none absolute inset-0 m-0 flex items-center justify-center text-sm text-role-on-surface-variant"
      v-text="$gettext('Draw your signature here')"
    />
    <svg
      ref="drawArea"
      class="pdf-viewer-signature-draw absolute inset-0 size-full cursor-crosshair touch-none"
      :aria-label="$gettext('Draw your signature here')"
      role="img"
      @pointerdown="startStroke"
      @pointermove="continueStroke"
      @pointerup="endStroke"
      @pointercancel="endStroke"
    >
      <path
        :d="path"
        fill="none"
        stroke="currentColor"
        :stroke-width="thickness"
        stroke-linecap="round"
        pointer-events="none"
      />
    </svg>
  </div>
  <div
    class="flex items-center justify-between gap-4 border-t border-role-outline-variant py-1 ps-3 pe-1"
  >
    <oc-range
      :model-value="thickness"
      class="pdf-viewer-signature-thickness max-w-80 min-w-0 text-sm [&>label]:truncate"
      input-class="min-w-20"
      :label="$gettext('Drawing thickness')"
      :min="MIN_THICKNESS"
      :max="MAX_THICKNESS"
      inline-label
      @update:model-value="setThickness"
    />
    <oc-button
      v-oc-tooltip="$gettext('Clear')"
      class="pdf-viewer-signature-clear shrink-0 p-1.5"
      :aria-label="$gettext('Clear')"
      appearance="raw"
      :disabled="!curves"
      @click="clear"
    >
      <oc-icon name="eraser" fill-type="line" size-class="size-4" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref, useTemplateRef } from 'vue'
import type { DrawnCurves } from '../composables/usePdfSignature'

// Like PDF.js' signature dialog.
const MIN_THICKNESS = 1
const MAX_THICKNESS = 5

// The strokes, collected the way PDF.js' signature dialog does.
const curves = defineModel<DrawnCurves>()
const thickness = ref(unref(curves)?.thickness || MIN_THICKNESS)
// The stroke being drawn, added to the strokes once it ends.
const stroke = ref<number[]>()

const drawArea = useTemplateRef<SVGSVGElement>('drawArea')

function toPath(points: number[]) {
  let path = ''
  for (let i = 0; i < points.length; i += 2) {
    path += `${i ? ' L' : ' M'} ${points[i]} ${points[i + 1]}`
  }
  return path
}

const path = computed(() =>
  [...(unref(curves)?.curves ?? []), { points: unref(stroke) ?? [] }]
    .map(({ points }) => toPath(points))
    .join('')
)

function startStroke(event: PointerEvent) {
  // Keeps the stroke going when the pointer leaves the area.
  unref(drawArea).setPointerCapture(event.pointerId)
  stroke.value = [Math.round(event.offsetX), Math.round(event.offsetY)]
}

function continueStroke(event: PointerEvent) {
  unref(stroke)?.push(Math.round(event.offsetX), Math.round(event.offsetY))
}

function endStroke() {
  const points = unref(stroke)
  if (!points) {
    return
  }
  stroke.value = undefined
  const { width, height } = unref(drawArea).getBoundingClientRect()
  const drawn = unref(curves) || { width, height, thickness: unref(thickness), curves: [] }
  curves.value = { ...drawn, curves: [...drawn.curves, { points }] }
}

// Applies to the whole drawing, like in PDF.js' signature dialog.
function setThickness(value: number) {
  thickness.value = value
  const drawn = unref(curves)
  if (drawn) {
    curves.value = { ...drawn, thickness: value }
  }
}

function clear() {
  curves.value = undefined
  thickness.value = MIN_THICKNESS
}
</script>
