<template>
  <div class="no-content-message flex flex-col justify-center items-center text-center">
    <inline-svg
      v-if="imgSrc"
      :src="imgSrc"
      class="mb-4 no-content-message-svg"
      :class="{ 'is-light': !currentTheme.isDark }"
      width="120"
      height="120"
      :aria-label="$gettext('No content image')"
    />
    <oc-icon
      v-if="icon"
      :name="icon"
      type="div"
      size="xxlarge"
      :fill-type="iconFillType"
      class="mb-4"
    />
    <div class="text-role-on-surface-variant text-xl">
      <slot name="message" />
    </div>
    <div class="text-role-on-surface-variant mt-1">
      <slot name="callToAction" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import InlineSvg from 'vue-inline-svg'
import { FillType } from '@opencloud-eu/design-system/helpers'
import { useThemeStore } from '../composables'

InlineSvg.name = 'inline-svg'

const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

const {
  icon = '',
  iconFillType = 'fill',
  imgSrc = ''
} = defineProps<{
  icon?: string
  iconFillType?: FillType
  imgSrc?: string
}>()
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .no-content-message {
    height: 65vh;
  }

  .no-content-message-svg.is-light :deep(.background-splash) {
    fill: #f2f4f5;
  }
}
</style>
