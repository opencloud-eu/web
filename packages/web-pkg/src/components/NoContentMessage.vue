<template>
  <div class="no-content-message flex flex-col justify-center items-center text-center">
    <oc-image
      v-if="imgSrc"
      width="120"
      height="120"
      :src="imgSrc"
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
import { FillType } from '@opencloud-eu/design-system/helpers'

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
    height: 75vh;
  }
}
</style>
