<template>
  <component :is="tag" class="oc-card">
    <div v-if="hasSlotHeader" class="oc-card-header">
      <slot name="header">
        <component v-if="title" :is="titleTag" class="oc-card-title">
          {{ title }}
        </component>
      </slot>
    </div>
    <div class="oc-card-body">
      <slot />
    </div>
    <div v-if="hasSlotFooter" class="oc-card-footer">
      <slot name="footer" />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'

export interface Props {
  /**
   * @docs The html tag being used to render this card.
   * @default 'div'
   */
  tag?: string
  /**
   * @docs The title for the default card header. Don't provide one if you fill the 'header' slot yourself.
   */
  title?: string
  /**
   * @docs The html tag being used to render the title of this card.
   * @default 'h2'
   */
  titleTag?: string
}

export interface Slots {
  /**
   * @docs Content of the card.
   */
  default?: () => unknown
  /**
   * @docs Content of the header. By default, this is filled with a `<h2>` tag which renders the title.
   */
  header?: () => unknown
  /**
   * @docs Content of the footer. Empty by default.
   */
  footer?: () => unknown
}

const { tag = 'div', title, titleTag = 'h2' } = defineProps<Props>()

const slots = defineSlots<Slots>()

const hasSlotHeader = computed(() => {
  return Object.hasOwn(slots, 'header') || !!unref(title)
})
const hasSlotFooter = computed(() => {
  return Object.hasOwn(slots, 'footer')
})
</script>

<style>
@reference "@opencloud-eu/design-system/tailwind";

@layer components {
  .oc-card {
    @apply bg-role-surface text-role-on-surface relative box-border rounded-sm;
    transition: box-shadow 0.1s ease-in-out;
  }

  .oc-card-header {
    @apply px-2 py-4 border-b border-role-outline;
    display: flow-root;
  }

  .oc-card-body {
    @apply p-6;
    display: flow-root;
  }

  .oc-card-footer {
    @apply px-4 py-6;
    display: flow-root;
  }

  .oc-card-body > :last-child,
  .oc-card-header > :last-child,
  .oc-card-footer > :last-child {
    @apply mb-0;
  }
}
</style>
