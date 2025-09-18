<template>
  <component :is="tag" class="oc-card">
    <div v-if="hasSlotHeader" class="oc-card-header" :class="headerClass">
      <slot name="header">
        <img
          v-if="logoUrl"
          :src="logoUrl"
          alt=""
          :aria-hidden="true"
          class="max-w-48 max-h-48 absolute -translate-y-16"
        />
        <component :is="titleTag" v-if="title" class="mt-0">
          {{ title }}
        </component>
      </slot>
    </div>
    <div class="oc-card-body" :class="bodyClass">
      <slot />
    </div>
    <div v-if="hasSlotFooter" class="oc-card-footer" :class="footerClass">
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
  /**
   * @docs The url of the logo to be rendered in the header of this card.
   * @default ''
   */
  logoUrl?: string
  /**
   * @docs The classes to be applied on the card header
   * @default ''
   */
  headerClass?: string | string[] | Record<string, boolean> | Record<string, boolean>[]
  /**
   * @docs The classes to be applied on the card body.
   * @default ''
   */
  bodyClass?: string | string[] | Record<string, boolean> | Record<string, boolean>[]
  /**
   * @docs The classes to be applied on the card footer.
   * @default ''
   */
  footerClass?: string | string[] | Record<string, boolean> | Record<string, boolean>[]
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

const {
  tag = 'div',
  title,
  titleTag = 'h2',
  logoUrl = '',
  headerClass = '',
  bodyClass = '',
  footerClass = ''
} = defineProps<Props>()

const slots = defineSlots<Slots>()

const hasSlotHeader = computed(() => {
  return Object.hasOwn(slots, 'header') || !!unref(title) || !!unref(logoUrl)
})
const hasSlotFooter = computed(() => {
  return Object.hasOwn(slots, 'footer')
})
</script>

<style>
@reference "@opencloud-eu/design-system/tailwind";

@layer components {
  .oc-card {
    @apply bg-role-surface text-role-on-surface rounded-md relative;
  }

  .oc-card-header {
    @apply p-4 pb-0 flex flex-col items-center relative;
  }

  .oc-card-body {
    @apply p-4 flow-root;
  }

  .oc-card-footer {
    @apply p-4 pt-0 flex flex-col items-center text-sm;
  }

  .oc-card-body > :last-child,
  .oc-card-header > :last-child,
  .oc-card-footer > :last-child {
    @apply mb-0;
  }
}
</style>
