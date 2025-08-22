<template>
  <span
    class="oc-avatar-count flex justify-center items-center"
    :style="{ width: size + 'px', height: size + 'px', fontSize: fontSize }"
    v-text="`+${count}`"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  /**
   * @docs The number to display inside the avatar.
   */
  count: number
  /**
   * @docs The size in px of the avatar.
   * @default 30
   */
  size?: number
}

const { count, size = 30 } = defineProps<Props>()

const fontSize = computed(() => {
  return Math.floor(size / 2.5) + 'px'
})
</script>

<style lang="scss">
.oc-avatar-count {
  background-color: var(--oc-role-secondary);
  border-radius: 50%;
  color: var(--oc-role-on-secondary);
  border: 1px solid var(--oc-role-outline-variant);
}
</style>
