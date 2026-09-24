<template>
  <section class="oc-section rounded-lg bg-role-surface-container p-3">
    <component :is="titleTag" class="oc-section-heading m-0 text-base font-normal">
      <component
        :is="expandable ? OcButton : 'div'"
        class="oc-section-header flex w-full items-center justify-between"
        v-bind="expandable ? toggleAttrs : {}"
        @click="toggle"
      >
        <span class="flex flex-row items-center gap-4">
          <oc-icon
            v-if="icon"
            :name="icon"
            fill-type="line"
            size-class="size-5"
            color="var(--oc-role-on-surface)"
          />
          <span class="flex flex-col items-start text-left">
            <span class="oc-section-title font-semibold text-role-on-surface" v-text="title" />
            <span
              v-if="subtitle"
              class="oc-section-subtitle text-sm text-role-on-surface-variant"
              v-text="subtitle"
            />
          </span>
        </span>
        <oc-icon
          v-if="expandable"
          :name="expanded ? 'arrow-up-s' : 'arrow-down-s'"
          fill-type="line"
          size-class="size-5"
          color="var(--oc-role-on-surface)"
        />
      </component>
    </component>
    <div
      v-if="!expandable || expanded"
      :id="contentId"
      class="oc-section-content flex flex-col gap-4 pt-4"
      :class="{ 'pl-9': icon }"
    >
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import { uniqueId } from '../../helpers'

export interface Props {
  /**
   * @docs The title of the section.
   */
  title: string
  /**
   * @docs A short text shown below the title, e.g. to describe or summarize the content.
   */
  subtitle?: string
  /**
   * @docs The name of the icon shown in front of the title. The content gets indented to align with the title.
   */
  icon?: string
  /**
   * @docs Determines if the content can be collapsed and expanded by clicking the header. Use `v-model:expanded` to control or observe the state.
   * @default false
   */
  expandable?: boolean
  /**
   * @docs The html tag being used to render the section heading.
   * @default 'h2'
   */
  titleTag?: string
}

export interface Slots {
  /**
   * @docs Content of the section. Not rendered while an expandable section is collapsed.
   */
  default?: () => unknown
}

const {
  title,
  subtitle = '',
  icon = '',
  expandable = false,
  titleTag = 'h2'
} = defineProps<Props>()

defineSlots<Slots>()

/**
 * @docs Determines if the content of an expandable section is visible.
 */
const expanded = defineModel<boolean>('expanded', { default: true })

const contentId = uniqueId('oc-section-content-')

const toggleAttrs = computed(() => ({
  class: 'oc-section-toggle',
  appearance: 'raw',
  gapSize: 'xsmall',
  justifyContent: 'space-between',
  noHover: true,
  'aria-expanded': unref(expanded),
  'aria-controls': contentId
}))

function toggle() {
  if (!expandable) {
    return
  }
  expanded.value = !unref(expanded)
}
</script>
