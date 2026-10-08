<template>
  <div
    class="oc-application-icon inline-flex items-center justify-center rounded-sm w-8 h-8"
    :class="{ 'overflow-hidden': fillsTile }"
    :style="iconStyle"
  >
    <oc-icon
      :icon="icon"
      color="var(--oc-role-on-secondary)"
      :size-class="fillsTile ? 'size-8' : 'size-5'"
    />
  </div>
</template>

<script setup lang="ts">
import {
  generateHashedColorForString,
  getHexFromCssVar,
  hexToRgb,
  Icon,
  isImageIcon,
  rgbToHex,
  setDesiredContrastRatio
} from '../../helpers'
import { computed, unref } from 'vue'
import OcIcon from '../OcIcon/OcIcon.vue'

export interface Props {
  /**
   * @docs Icon to display. An image icon fills the whole tile unless `colorPrimary` is set, in which case it is displayed in icon size on the colored tile.
   */
  icon: Icon
  /**
   * @docs Hex-code of the primary color to display. This color is being used for the left side of the gradient.
   */
  colorPrimary?: string
}

const { icon, colorPrimary } = defineProps<Props>()

const primaryColor = computed(() => {
  return getHexFromCssVar(colorPrimary || '')
})

const hasPrimaryColor = computed(() => {
  return !!colorPrimary
})

const fillsTile = computed(() => {
  return isImageIcon(icon) && !unref(hasPrimaryColor)
})

const generatedHashedPrimaryColor = computed((): string => {
  const hashedColor = generateHashedColorForString(typeof icon === 'string' ? icon : icon.name)
  return rgbToHex(setDesiredContrastRatio(hexToRgb(hashedColor), hexToRgb('#ffffff'), 4))
})

const iconStyle = computed(() => {
  if (unref(fillsTile)) {
    return undefined
  }

  const primaryHex = unref(hasPrimaryColor)
    ? unref(primaryColor)
    : unref(generatedHashedPrimaryColor)

  return {
    background: unref(primaryHex)
  }
})
</script>
