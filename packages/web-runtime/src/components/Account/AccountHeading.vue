<template>
  <div class="flex justify-between items-center gap-4 mb-4" :class="isPageTitle ? 'mt-2' : 'mt-8'">
    <div>
      <component :is="tag" class="my-0" :class="isPageTitle ? 'text-2xl' : 'text-lg'">
        {{ title }}
      </component>
      <p v-if="subtitle" class="text-sm text-role-on-surface-variant mt-1 mb-0" v-text="subtitle" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const {
  title,
  subtitle = '',
  tag = 'h1'
} = defineProps<{
  title: string
  subtitle?: string
  tag?: 'h1' | 'h2'
}>()

const isPageTitle = computed(() => tag === 'h1')
</script>
