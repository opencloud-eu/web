<template>
  <div class="no-content-message flex flex-col justify-center items-center text-center">
    <component
      :is="isSvg ? InlineSvg : 'oc-image'"
      v-if="imgSrc"
      :src="imgSrc"
      class="mb-4 no-content-message-image"
      width="120"
      height="120"
      :alt="$gettext('No content image')"
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
import { computed } from 'vue'
import InlineSvg from 'vue-inline-svg'
import { FillType } from '@opencloud-eu/design-system/helpers'

InlineSvg.name = 'inline-svg'

const {
  icon = '',
  iconFillType = 'fill',
  imgSrc = ''
} = defineProps<{
  icon?: string
  iconFillType?: FillType
  imgSrc?: string
}>()

const isSvg = computed(() => imgSrc.toLowerCase().endsWith('.svg'))
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .no-content-message {
    height: 65vh;
  }

  .no-content-message-image :deep(.background-splash) {
    fill: var(--oc-role-surface-container-highest);
  }
}
</style>
