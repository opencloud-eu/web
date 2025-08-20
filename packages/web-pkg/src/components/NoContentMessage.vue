<template>
  <div
    class="no-content-message oc-flex oc-flex-column oc-flex-center oc-flex-middle oc-text-center"
  >
    <oc-icon :name="icon" type="div" size="xxlarge" :fill-type="iconFillType" class="mb-4" />
    <div class="oc-text-muted text-xl">
      <slot name="message" />
    </div>
    <div class="oc-text-muted">
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
<style>
.no-content-message {
  height: 75vh;
}

.space-frontpage .no-content-message {
  height: 55vh;
}
</style>
