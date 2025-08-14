<template>
  <div :class="['oc-loader', { 'oc-loader-flat': flat }]" class="my-5" :aria-label="ariaLabel" />
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

<style lang="scss">
.oc-loader {
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: var(--oc-role-surface-container);
  border: 0;
  border-radius: 500px;
  display: block;
  height: 15px;
  overflow: hidden;
  vertical-align: baseline;
  width: 100%;
  position: relative;

  &-flat {
    border-radius: 0 !important;
    height: 5px !important;
  }

  &::after {
    background: var(--oc-role-secondary);
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
