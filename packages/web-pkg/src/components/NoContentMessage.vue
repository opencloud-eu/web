<template>
  <div class="no-content-message flex flex-col justify-center items-center text-center">
    <oc-icon :name="icon" type="div" size="xxlarge" :fill-type="iconFillType" class="mb-4" />
    <div class="text-role-on-surface-variant text-xl">
      <slot name="message" />
    </div>
    <div class="text-role-on-surface-variant">
      <slot name="callToAction" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FillType } from '@opencloud-eu/design-system/helpers'

const { icon, iconFillType = 'fill' } = defineProps<{
  icon: string
  iconFillType?: FillType
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
