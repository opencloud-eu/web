<template>
  <ul class="oc-list oc-my-rm oc-mx-rm" :class="{ 'oc-list-raw': raw }">
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

<style lang="scss">
ul.oc-list {
  list-style: none;
  margin: 0;
  padding: 0;

  &-divider > :nth-child(n + 2) {
    border-top: 0.5px solid var(--oc-role-outline-variant);
    margin-top: var(--oc-space-small);
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
</style>
