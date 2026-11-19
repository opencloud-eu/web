<template>
  <inline-svg
    :src="src"
    :title="title"
    :unique-ids="uniqueIds"
    :transform-source="transformSvgElement"
    @loaded="emit('loaded', $event)"
    @unloaded="emit('unloaded')"
    @error="emit('error', $event)"
  />
</template>

<script setup lang="ts">
import InlineSvg from 'vue-inline-svg'
import { sanitizeSvg } from '../../helpers/sanitizeSvg'

InlineSvg.name = 'inline-svg'

export interface Props {
  /**
   * @docs URL of the SVG file to load and inline.
   */
  src: string
  /**
   * @docs Title to set on the SVG, replaces an existing one.
   */
  title?: string
  /**
   * @docs Rewrites all IDs inside the SVG to be unique per instance. Only needed for SVGs that
   * reference IDs internally, e.g. via gradients or clip paths.
   * @default false
   */
  uniqueIds?: boolean
  /**
   * @docs Function to modify the SVG element before it gets rendered. Receives the already
   * sanitized element and has to return it.
   */
  transformSource?: (svg: SVGElement) => SVGElement
}

export interface Emits {
  /**
   * @docs Emitted when the SVG has been loaded and rendered.
   */
  (e: 'loaded', svg: SVGElement): void
  /**
   * @docs Emitted when the rendered SVG has been removed, e.g. because the source has changed.
   */
  (e: 'unloaded'): void
  /**
   * @docs Emitted when the SVG could not be loaded.
   */
  (e: 'error', error: Error): void
}

const {
  src,
  title = undefined,
  uniqueIds = false,
  transformSource = undefined
} = defineProps<Props>()

const emit = defineEmits<Emits>()

function transformSvgElement(svg: SVGElement) {
  const sanitizedSvg = sanitizeSvg(svg)
  if (!transformSource) {
    return sanitizedSvg
  }
  return transformSource(sanitizedSvg)
}
</script>
