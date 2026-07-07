<template>
  <component
    :is="type"
    :class="[
      'oc-icon',
      'box-content',
      'inline-block',
      'align-baseline',
      '[&_svg]:block',
      tailwindSize,
      { 'bg-transparent min-h-0': type === 'button' }
    ]"
  >
    <inline-svg
      :src="nameWithFillType"
      :transform-source="transformSvgElement"
      :aria-hidden="accessibleLabel === '' ? 'true' : null"
      :aria-labelledby="accessibleLabel === '' ? null : svgTitleId"
      :focusable="accessibleLabel === '' ? 'false' : null"
      :style="color !== '' ? { fill: color } : {}"
      :class="tailwindSize"
      @loaded="emit('loaded')"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InlineSvg from 'vue-inline-svg'
import { FillType, SizeType, uniqueId, getIconUrlPrefix } from '../../helpers'

InlineSvg.name = 'inline-svg'

export interface Props {
  /**
   * @docs Accessible label for the icon. Should be set if the icon fulfills a purpose and is not purely decorative.
   */
  accessibleLabel?: string
  /**
   * @docs Color of the icon.
   */
  color?: string
  /**
   * @docs Fill type of the icon.
   * @default fill
   */
  fillType?: FillType
  /**
   * @docs Name of the icon. Please refer to `Remixicon` for a list of available icons.
   */
  name?: string
  /**
   * @docs Size of the icon.
   * @default medium
   * @deprecated use sizeClass instead
   */
  size?: SizeType
  /**
   * @docs Tailwind size class for the icon. Please refer to Tailwind documentation for a list of available size classes.
   * @default size-5
   */
  sizeClass?: string
  /**
   * @docs HTML element to be used for the icon.
   * @default span
   */
  type?: string
}

export interface Emits {
  /**
   * @docs Emitted when the SVG has been loaded.
   */
  (e: 'loaded'): void
}

const {
  accessibleLabel = '',
  color = '',
  fillType = 'fill',
  name = 'info',
  size = undefined,
  sizeClass = 'size-5',
  type = 'span'
} = defineProps<Props>()

const emit = defineEmits<Emits>()

const svgTitleId = computed(() => uniqueId('oc-icon-title-'))

const nameWithFillType = computed(() => {
  const path = `${getIconUrlPrefix()}icons/`
  const lowerFillType = fillType.toLowerCase()
  if (lowerFillType === 'none') {
    return `${path}${name}.svg`
  }
  return `${path}${name}-${lowerFillType}.svg`
})

const tailwindSize = computed(() => {
  const getSize = (s: string) => {
    return {
      'size-3': s === 'xsmall',
      'size-4': s === 'small',
      'size-5': s === 'medium',
      'size-8': s === 'large',
      'size-12': s === 'xlarge',
      'size-22': s === 'xxlarge',
      'size-42': s === 'xxxlarge'
    }
  }
  if (size) {
    return getSize(size)
  }
  if (sizeClass) {
    return sizeClass
  }
  return getSize('medium')
})

const transformSvgElement = (svg: SVGElement) => {
  if (accessibleLabel !== '') {
    const title = document.createElement('title')
    title.setAttribute('id', svgTitleId.value)
    title.appendChild(document.createTextNode(accessibleLabel))
    svg.insertBefore(title, svg.firstChild)
  }
  return svg
}
</script>
