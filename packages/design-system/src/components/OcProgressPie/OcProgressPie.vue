<template>
  <div
    class="oc-progress-pie relative after:block after:size-full after:content-['']"
    :data-fill="fill"
  >
    <div
      class="oc-progress-pie-container absolute left-0 top-0 after:absolute after:left-0 after:top-0 before:block after:block size-full after:size-full after:content-[''] before:content-['']"
    />
    <label
      v-if="showLabel"
      class="oc-progress-pie-label absolute top-[50%] left-[50%] text-role-on-surface-variant transform-[translate(-50%, -50%)]"
      v-text="label"
    />
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
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-progress-pie {
    @apply m-4;
  }
}
</style>
<style lang="scss" scoped>
$default-size: 64px;

.oc-progress-pie {
  height: $default-size;
  width: $default-size;

  // Shadow
  &::after {
    border: calc($default-size / 10) solid var(--oc-role-surface-container);
    border-radius: 50%;
  }

  &-container {
    clip: rect(0, $default-size, $default-size, calc($default-size / 2));

    &::before,
    &::after {
      border: calc($default-size / 10) solid var(--oc-role-secondary);
      border-color: var(--oc-role-secondary);
      border-radius: 50%;
      clip: rect(0, calc($default-size / 2), $default-size, 0);
    }
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
