<template>
  <ul class="oc-list" :class="{ 'oc-list-raw': raw }">
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
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  ul.oc-list,
  ul.oc-list.oc-timeline {
    @apply m-0 p-0;
  }
  ul.oc-list.oc-timeline {
    @apply relative before:absolute before:inset-0;
  }
  ul.oc-list-divider > :nth-child(n + 2) {
    @apply mt-2 pt-2 border-t;
  }
  ul.oc-list.oc-timeline li {
    @apply py-2 pl-8 pr-7 flex flex-col before:rounded-[50%] w-full relative;
  }
  ul.oc-list.oc-timeline li:before {
    @apply absolute;
    left: -4px;
    top: 50%;
  }
  ul.oc-list.oc-timeline::before,
  ul.oc-list.oc-timeline li::before {
    @apply bg-role-outline-variant;
  }
  ul.oc-list.oc-timeline::before {
    width: 1.5px;
    content: '';
  }
  ul.oc-list.oc-timeline li::before {
    @apply size-2.5;
    transform: translateY(-50%);
    content: '';
  }
  ul.oc-list-raw a:hover {
    @apply text-inherit;
  }
  .oc-list li::before {
    @apply z-1;
  }
}
</style>
