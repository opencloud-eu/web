<template>
  <oc-drop
    ref="drop"
    class="w-full oc-info-drop inline-block"
    :drop-id="dropId"
    :toggle="toggle"
    :mode="mode"
    close-on-click
    :enforce-drop-on-mobile="true"
    @hide-drop="() => (dropOpen = false)"
    @show-drop="() => (dropOpen = true)"
  >
    <focus-trap :active="dropOpen">
      <div class="info-drop-content">
        <div class="flex justify-between items-center info-header border-b pb-2">
          <h4 class="m-0 info-title text-lg font-normal" v-text="$gettext(title)" />
          <oc-button appearance="raw" :aria-label="$gettext('Close')" class="align-middle">
            <oc-icon name="close" fill-type="line" size="medium" />
          </oc-button>
        </div>
        <p v-if="text" class="info-text first:mt-0 last:mb-0" v-text="$gettext(text)" />
        <dl v-if="listItems.length" class="info-list mt-2 mb-1 first:mt-0 last:mb-0">
          <component
            :is="item.headline ? 'dt' : 'dd'"
            v-for="(item, index) in listItems"
            :key="index"
            :class="{
              'ml-0': !item.headline,
              'first:mt-0': item.headline,
              'font-bold': item.headline
            }"
          >
            {{ $gettext(item.text) }}
          </component>
        </dl>
        <p v-if="endText" class="info-text-end" v-text="$gettext(endText)" />
        <oc-button
          v-if="readMoreLink"
          type="a"
          appearance="raw"
          class="info-more-link"
          :href="readMoreLink"
          target="_blank"
        >
          {{ $gettext('Read more') }}
        </oc-button>
      </div>
    </focus-trap>
  </oc-drop>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { FocusTrap } from 'focus-trap-vue'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcDrop, { Props as OcDropProps } from '../OcDrop/OcDrop.vue'
import { uniqueId } from '../../helpers'
import { ContextualHelperDataListItem } from '../../helpers'

export interface Props {
  /**
   * @docs Title of the info drop.
   */
  title: string
  /**
   * @docs Element ID of the info drop.
   */
  dropId?: string
  /**
   * @docs Text at the end of the info drop.
   */
  endText?: string
  /**
   * @docs List of items to display in the info drop. Please refer to the component source for the `ContextualHelperDataListItem` type definition.
   */
  list?: ContextualHelperDataListItem[]
  /**
   * @docs Event that triggers the info drop.
   * @default 'click'
   */
  mode?: OcDropProps['mode']
  /**
   * @docs Link at the end of the info drop.
   */
  readMoreLink?: string
  /**
   * @docs Text to display in the info drop.
   */
  text?: string
  /**
   * @docs CSS selector for the element to be used as toggle. By default, the preceding element is used.
   */
  toggle?: string
}

const {
  title,
  dropId = uniqueId('oc-info-drop-'),
  endText = '',
  list = [],
  mode = 'click',
  readMoreLink = '',
  text = '',
  toggle = ''
} = defineProps<Props>()

const dropOpen = ref(false)

const listItems = computed(() => {
  return (list || []).filter((item) => !!item.text)
})
</script>
