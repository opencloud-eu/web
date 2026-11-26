<template>
  <li>
    <oc-button
      v-bind="$attrs"
      class="w-full p-2"
      :class="{
        'forced-colors:outline-2 forced-colors:-outline-offset-2 forced-colors:outline-[Highlight]':
          isActive
      }"
      :aria-current="isActive || undefined"
      :appearance="isActive ? 'filled' : 'raw-inverse'"
      :color-role="isActive ? 'secondaryContainer' : 'surface'"
      :no-hover="isActive"
      justify-content="left"
    >
      <oc-icon v-if="icon" :name="icon" :fill-type="fillType" size-class="size-4" />
      <span v-text="label" />
    </oc-button>
  </li>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const {
  label,
  icon = undefined,
  fillType = 'line',
  isActive = false
} = defineProps<{
  label: string
  icon?: string
  fillType?: 'line' | 'fill' | 'none'
  /** For options: marks the chosen one. */
  isActive?: boolean
}>()
</script>
