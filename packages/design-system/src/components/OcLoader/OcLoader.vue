<template>
  <div
    :class="[
      'oc-loader',
      'block',
      'after:block',
      'bg-role-surface-container',
      'after:bg-role-secondary',
      'w-full',
      'after:w-0',
      'after:h-full',
      'overflow-hidden',
      { 'oc-loader-flat rounded-none h-1': flat },
      { 'rounded-[500px] h-4': !flat }
    ]"
    :aria-label="ariaLabel"
  />
</template>

<script setup lang="ts">
export interface Props {
  /**
   * @docs Aria label to describe the loader's purpose for screen readers.
   */
  ariaLabel?: string
  /**
   * @docs Determines if the loader is visually flat.
   * @default false
   */
  flat?: boolean
}

const { ariaLabel = 'Loading', flat = false } = defineProps<Props>()
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-loader {
    @apply my-5 align-baseline;
  }
}
</style>
<style lang="scss">
.oc-loader {
  -webkit-appearance: none;
  -moz-appearance: none;
  position: relative;

  &::after {
    content: '';
    position: absolute;

    animation: {
      duration: 1.4s;
      iteration-count: infinite;
      name: oc-loader;
    }
  }
}

@keyframes oc-loader {
  0% {
    left: 0;
    width: 0;
  }

  50% {
    left: 0;
    width: 66%;
  }

  100% {
    left: 100%;
    width: 10%;
  }
}
</style>
