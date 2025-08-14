<template>
  <div class="oc-progress-pie m-4" :data-fill="fill">
    <div class="oc-progress-pie-container" />
    <label v-if="showLabel" class="oc-progress-pie-label oc-text-muted" v-text="label" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  /**
   * @docs The maximum value of the progress.
   * @default 100
   */
  max?: number
  /**
   * @docs The current progress value.
   * @default 0
   */
  progress?: number
  /**
   * @docs Determines if the label should be shown.
   * @default false
   */
  showLabel?: boolean
}

const { max = 100, progress = 0, showLabel = false } = defineProps<Props>()

const fill = computed(() => {
  return Math.round((100 / max) * progress)
})

const label = computed(() => {
  if (max === 100) {
    return progress + '%'
  } else {
    return `${progress}/${max}`
  }
})
</script>

<style lang="scss">
$default-size: 64px;

.oc-progress-pie {
  height: $default-size;
  position: relative;
  width: $default-size;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  // Shadow
  &::after {
    border: calc($default-size / 10) solid var(--oc-role-surface-container);
    border-radius: 50%;
    box-sizing: border-box;
    content: '';
    display: block;
    height: 100%;
    width: 100%;
  }

  &-container {
    clip: rect(0, $default-size, $default-size, calc($default-size / 2));
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;

    &::before,
    &::after {
      border: calc($default-size / 10) solid var(--oc-role-secondary);
      border-color: var(--oc-role-secondary);
      border-radius: 50%;
      clip: rect(0, calc($default-size / 2), $default-size, 0);
      content: '';
      display: block;
      height: 100%;
      left: 0;
      position: absolute;
      top: 0;
      width: 100%;
    }
  }

  &-label {
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
  }
}

@for $i from 0 through 100 {
  .oc-progress-pie[data-fill='#{$i}'] {
    .oc-progress-pie-container::before {
      transform: rotate($i * 3.6deg);
    }

    @if $i <= 50 {
      .oc-progress-pie-container::after {
        display: none;
      }
    } @else {
      .oc-progress-pie-container {
        clip: rect(auto, auto, auto, auto);
      }

      .oc-progress-pie-container::after {
        transform: rotate(180deg);
      }
    }
  }
}
</style>
