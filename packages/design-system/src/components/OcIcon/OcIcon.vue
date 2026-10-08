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
    <img
      v-if="imageSrc !== undefined"
      :src="imageSrc"
      :alt="accessibleLabel"
      :aria-hidden="accessibleLabel === '' ? 'true' : null"
      :class="['block object-contain', tailwindSize, { 'opacity-0': hasImageError }]"
      @load="emit('loaded')"
      @error="onImageError"
    />
    <inline-svg
      v-else
      :src="nameWithFillType"
      :unique-ids="uniqueIds"
      :transform-source="transformSvgElement"
      :aria-hidden="accessibleLabel === '' ? 'true' : null"
      :aria-labelledby="accessibleLabel === '' ? null : svgTitleId"
      :focusable="accessibleLabel === '' ? 'false' : null"
      :style="namedIcon.color !== '' ? { fill: namedIcon.color } : {}"
      :class="tailwindSize"
      @loaded="emit('loaded')"
      @error="emit('error')"
    />
  </component>
</template>

<script setup lang="ts">
import { computed, inject, MaybeRefOrGetter, ref, toValue, unref, watch } from 'vue'
import InlineSvg from 'vue-inline-svg'
import {
  FillType,
  Icon,
  SizeType,
  hasDarkIconVariant,
  iconIsDarkInjectionKey,
  isImageIcon,
  uniqueId,
  getIconUrlPrefix,
  addVersionToAssetUrl
} from '../../helpers'

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
   * @docs Icon to display. Takes precedence over `name`.
   */
  icon?: Icon
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
  /**
   * @docs Rewrites all IDs inside the SVG to be unique per instance. Only needed for icons that
   * reference IDs internally, e.g. via gradients or clip paths.
   * @default false
   */
  uniqueIds?: boolean
}

export interface Emits {
  /**
   * @docs Emitted when the SVG or the image has been loaded.
   */
  (e: 'loaded'): void
  /**
   * @docs Emitted when the SVG or the image could not be loaded, e.g. because the icon does not exist.
   */
  (e: 'error'): void
}

const {
  accessibleLabel = '',
  color = '',
  fillType = 'fill',
  icon = undefined,
  name = 'info',
  size = undefined,
  sizeClass = 'size-5',
  type = 'span',
  uniqueIds = false
} = defineProps<Props>()

const emit = defineEmits<Emits>()

const svgTitleId = computed(() => uniqueId('oc-icon-title-'))

const isDark = inject<MaybeRefOrGetter<boolean>>(iconIsDarkInjectionKey, false)

const imageSrc = computed(() => {
  if (!isImageIcon(icon)) {
    return undefined
  }
  return (toValue(isDark) && icon.srcDark) || icon.src
})

const hasImageError = ref(false)
watch(imageSrc, () => {
  hasImageError.value = false
})

function onImageError() {
  hasImageError.value = true
  emit('error')
}

const namedIcon = computed(() => {
  if (typeof icon === 'string') {
    return { name: icon, fillType, color }
  }
  return {
    name: icon?.name ?? name,
    fillType: icon?.fillType ?? fillType,
    color: icon?.color ?? color
  }
})

const nameWithFillType = computed(() => {
  const prefix = getIconUrlPrefix()
  const { name: iconName, fillType: iconFillType } = unref(namedIcon)
  const lowerFillType = iconFillType.toLowerCase()

  if (lowerFillType === 'fill' && toValue(isDark) && hasDarkIconVariant(iconName)) {
    return addVersionToAssetUrl(`${prefix}icons/${iconName}-dark-fill.svg`)
  }

  const filename = lowerFillType === 'none' ? `${iconName}.svg` : `${iconName}-${lowerFillType}.svg`

  const url = `${prefix}icons/${filename}`
  return addVersionToAssetUrl(url)
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
