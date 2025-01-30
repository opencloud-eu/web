<template>
  <component
    :is="type"
    :class="[{ 'oc-button-reset': type === 'button' }, 'oc-icon', sizeClass(size)]"
  >
    <inline-svg
      :src="nameWithFillType"
      :transform-source="transformSvgElement"
      :aria-hidden="accessibleLabel === '' ? 'true' : null"
      :aria-labelledby="accessibleLabel === '' ? null : svgTitleId"
      :focusable="accessibleLabel === '' ? 'false' : null"
      :style="color !== '' ? { fill: color } : {}"
      @loaded="emit('loaded')"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InlineSvg from 'vue-inline-svg'
import { FillType, getSizeClass, SizeType, uniqueId } from '../../helpers'

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
   */
  size?: SizeType
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
  size = 'medium',
  type = 'span'
} = defineProps<Props>()

const emit = defineEmits<Emits>()

const svgTitleId = computed(() => uniqueId('oc-icon-title-'))

const nameWithFillType = computed(() => {
  const path = 'icons/'
  const lowerFillType = fillType.toLowerCase()
  if (lowerFillType === 'none') {
    return `${path}${name}.svg`
  }
  return `${path}${name}-${lowerFillType}.svg`
})

const sizeClass = (c: string) => {
  return prefix(getSizeClass(c))
}

const prefix = (string: string) => {
  if (string !== null) {
    return `oc-icon-${string}`
  }
}

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

<style lang="scss">
@mixin oc-icon-size($factor) {
  height: $oc-size-icon-default * $factor;
  max-height: $oc-size-icon-default * $factor;
  max-width: $oc-size-icon-default * $factor;
  width: $oc-size-icon-default * $factor;
}

.oc-icon {
  // SVG wrapper
  display: inline-block;
  vertical-align: baseline;

  svg {
    display: block;
  }

  &,
  > svg {
    @include oc-icon-size(1);
  }

  &-xs {
    &,
    > svg {
      @include oc-icon-size(0.5);
    }
  }

  &-s {
    &,
    > svg {
      @include oc-icon-size(0.7);
    }
  }

  &-m {
    &,
    > svg {
      @include oc-icon-size(1);
    }
  }

  &-l {
    &,
    > svg {
      @include oc-icon-size(1.5);
    }
  }

  &-xl {
    &,
    > svg {
      @include oc-icon-size(2);
    }
  }

  &-xxl {
    &,
    > svg {
      @include oc-icon-size(4);
    }
  }

  &-xxxl {
    &,
    > svg {
      @include oc-icon-size(8);
    }
  }
}
</style>
