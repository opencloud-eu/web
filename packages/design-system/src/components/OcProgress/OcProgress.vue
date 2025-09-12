<template>
  <div
    class="oc-progress block relative overflow-x-hidden"
    :class="{ 'h-4': size === 'default', 'h-1': size === 'small', 'h-0.5': size === 'xsmall' }"
    :aria-valuemax="max"
    :aria-valuenow="value"
    aria-busy="true"
    aria-valuemin="0"
    role="progressbar"
    :style="{ backgroundColor }"
  >
    <div
      v-if="!indeterminate"
      class="absolute size-full transition-[width] duration-500"
      :style="{ width: progressValue, backgroundColor: color }"
    ></div>
    <div v-else class="oc-progress-indeterminate">
      <div
        class="oc-progress-indeterminate-first absolute h-full"
        :style="{ backgroundColor: color }"
      />
      <div
        class="oc-progress-indeterminate-second absolute h-full"
        :style="{ backgroundColor: color }"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  /**
   * @docs The color of the progress bar. It can be any valid CSS color or registered color role.
   * @default var(--oc-role-secondary)
   */
  color?: string
  /**
   * @docs The background color of the progress bar. It can be any valid CSS color or registered color role.
   * @default var(--oc-role-surface-container)
   */
  backgroundColor?: string
  /**
   * @docs Determines if the progress bar is indeterminate.
   * @default false
   */
  indeterminate?: boolean
  /**
   * @docs The maximum value of the progress bar.
   */
  max?: number
  /**
   * @docs The size of the progress bar.
   * @default default
   */
  size?: 'default' | 'small' | 'xsmall'
  /**
   * @docs The current value of the progress bar.
   * @default 0
   */
  value?: number
}

const {
  color = 'var(--oc-role-secondary)',
  backgroundColor = 'var(--oc-role-surface-container)',
  indeterminate = false,
  max,
  size = 'default',
  value = 0
} = defineProps<Props>()

const progressValue = computed(() => {
  if (!max) {
    return '-'
  }
  const num = (value / max) * 100
  return `${num}%`
})
</script>

<style lang="scss" scoped>
.oc-progress {
  &-indeterminate-first {
    animation-duration: 2s;
    animation-name: indeterminate-first;
    animation-iteration-count: infinite;
  }

  &-indeterminate-second {
    animation-duration: 2s;
    animation-delay: 0.5s;
    animation-name: indeterminate-second;
    animation-iteration-count: infinite;
  }

  @keyframes indeterminate-first {
    from {
      left: -10%;
      width: 10%;
    }
    to {
      left: 120%;
      width: 100%;
    }
  }

  @keyframes indeterminate-second {
    from {
      left: -100%;
      width: 80%;
    }
    to {
      left: 110%;
      width: 10%;
    }
  }
}
</style>
