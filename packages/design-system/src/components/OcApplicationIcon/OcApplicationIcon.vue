<template>
  <div
    class="oc-application-icon inline-flex items-center justify-center rounded-sm w-8 h-8"
    :style="iconStyle"
  >
    <oc-icon :name="icon" :color="iconColor" size="medium" />
  </div>
</template>

<script setup lang="ts">
import {
  generateHashedColorForString,
  getHexFromCssVar,
  hexToRgb,
  rgbToHex,
  setDesiredContrastRatio
} from '../../helpers'
import { computed, unref } from 'vue'
import OcIcon from '../OcIcon/OcIcon.vue'

export interface Props {
  /**
   * @docs Name of the icon to display. Please refer to the `OcIcon` component to see how to use icon names.
   */
  icon: string
  /**
   * @docs Hex-code of the primary color to display. This color is being used for the left side of the gradient.
   */
  colorPrimary?: string
}

const { icon, colorPrimary } = defineProps<Props>()

const iconColor = computed(() => {
  return 'rgba(255,255,255,0.7)'
})
const primaryColor = computed(() => {
  return getHexFromCssVar(colorPrimary || '')
})

const hasPrimaryColor = computed(() => {
  return !!colorPrimary
})

const generatedHashedPrimaryColor = computed((): string => {
  const hashedColor = generateHashedColorForString(icon)
  return rgbToHex(setDesiredContrastRatio(hexToRgb(hashedColor), hexToRgb('#ffffff'), 4))
})

const iconStyle = computed(() => {
  const primaryHex = unref(hasPrimaryColor)
    ? unref(primaryColor)
    : unref(generatedHashedPrimaryColor)

  return {
    background: unref(primaryHex)
  }
})
</script>

<style lang="scss">
.oc-application-icon {
  .oc-icon {
    svg {
      fill: var(--oc-role-on-secondary) !important;
    }
  }
}
</style>
