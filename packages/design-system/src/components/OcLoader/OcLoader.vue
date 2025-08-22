<template>
  <div
    :class="[
      'oc-loader',
      'bg-role-surface-container',
      'after:bg-role-secondary',
      { 'oc-loader-flat': flat }
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
  border: 0;
  border-radius: 500px;
  display: block;
  height: 15px;
  overflow: hidden;
  width: 100%;
  position: relative;

  &-flat {
    border-radius: 0 !important;
    height: 5px !important;
  }

  &::after {
    content: '';
    height: 100%;
    width: 0;
    display: block;
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
