<template>
  <ul class="oc-list my-0" :class="{ 'oc-list-raw': raw }">
    <slot />
  </ul>
</template>

<script setup lang="ts">
export interface Props {
  /**
   * @docs Render the list without any list style type.
   * @default false
   */
  raw?: boolean
}

export interface Slots {
  /**
   * @docs Content of the list, usually a bunch of HTML `li` elements.
   */
  default?: () => unknown
}

const { raw = false } = defineProps<Props>()

defineSlots<Slots>()
</script>
<style>
@reference 'tailwindcss';

@layer components {
  ul.oc-list,
  ul.oc-list.oc-timeline {
    @apply m-0 p-0;
  }
  ul.oc-list-divider > :nth-child(n + 2) {
    @apply mt-2;
  }
}
</style>
<style lang="scss">
ul.oc-list {
  list-style: none;

  &-divider > :nth-child(n + 2) {
    border-top: 0.5px solid var(--oc-role-outline-variant);
    padding-top: var(--oc-space-small);
  }
  &-raw {
    list-style-type: none;
    a {
      text-decoration: none !important;
      &:hover {
        color: inherit;
      }
    }
  }
}

ul.oc-list.oc-timeline {
  position: relative;
  list-style: none;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1.5px;
    background-color: var(--oc-role-outline-variant);
  }

  li {
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 10px 20px 10px 30px;
    width: 100%;
    box-sizing: border-box;

    &::before {
      content: '';
      width: 10px;
      height: 10px;
      background-color: var(--oc-role-outline-variant);
      border-radius: 50%;
      position: absolute;
      left: -4px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1;
    }
  }
}
</style>
