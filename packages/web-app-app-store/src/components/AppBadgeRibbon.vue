<template>
  <div
    v-if="app.badge"
    class="app-image-ribbon z-10 text-right size-[7rem] overflow-hidden absolute top-0 right-0 pointer-events-none"
    :class="[`app-image-ribbon-${app.badge.color}`]"
  >
    <span
      class="text-xs font-bold text-center leading-6 w-[10rem] block absolute top-[1.8rem] right-[-2.2rem] transform-[rotate(45deg)]"
      :class="colorClasses"
      >{{ app.badge.label }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { App } from '../types'

const { app } = defineProps<{
  app: App
}>()

const colorClasses = computed(() => {
  switch (app.badge?.color) {
    case 'danger':
      return ['bg-role-error', 'text-role-on-error']
    default:
      return ['bg-role-primary', 'text-role-on-primary']
  }
})
</script>
