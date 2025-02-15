<template>
  <span :class="spinnerClass" :aria-label="ariaLabel" tabindex="-1" role="img" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getSizeClass } from '../../helpers'

export interface Props {
  ariaLabel?: string
  size?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge'
}

const { ariaLabel = '', size = 'medium' } = defineProps<Props>()

const spinnerClass = computed(() => {
  return ['oc-spinner', `oc-spinner-${getSizeClass(size || 'medium')}`]
})
</script>

<style lang="scss">
@mixin oc-spinner-size($factor) {
  height: math.round(calc($oc-size-icon-default * $factor / 2)) * 2;
  width: math.round(calc($oc-size-icon-default * $factor / 2)) * 2;
}

.oc-spinner {
  @include oc-spinner-size(1);

  color: var(--oc-color-text-default);
  display: inline-block;

  &::after {
    animation: ball-clip-rotate 1s linear infinite;
    background: transparent;
    border: 1px solid currentColor;
    border-bottom-color: transparent;
    border-radius: 100%;
    content: '';
    display: block;
    height: 100%;
    width: 100%;
  }

  &,
  &::after {
    box-sizing: border-box;
    position: relative;
  }

  &-xs {
    @include oc-spinner-size(0.5);
  }

  &-s {
    @include oc-spinner-size(0.7);
  }

  &-search {
    @include oc-spinner-size(0.8);
  }

  &-m {
    @include oc-spinner-size(1);
  }

  &-l {
    @include oc-spinner-size(1.5);
  }

  &-xl {
    @include oc-spinner-size(2);
  }

  &-xxl {
    @include oc-spinner-size(4);
  }

  &-xxxl {
    @include oc-spinner-size(8);
  }
}

@keyframes ball-clip-rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
