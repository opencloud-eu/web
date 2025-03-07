<template>
  <oc-drop
    ref="drop"
    class="oc-width-1-1 oc-info-drop"
    :drop-id="dropId"
    :toggle="toggle"
    :mode="mode"
    close-on-click
    @hide-drop="() => (dropOpen = false)"
    @show-drop="() => (dropOpen = true)"
  >
    <focus-trap :active="dropOpen">
      <div class="info-drop-content">
        <div class="oc-flex oc-flex-between info-header oc-border-b oc-pb-s">
          <h4 class="oc-m-rm info-title" v-text="$gettext(title)" />
          <oc-button appearance="raw" :aria-label="$gettext('Close')">
            <oc-icon name="close" fill-type="line" size="medium" />
          </oc-button>
        </div>
        <p v-if="text" class="info-text" v-text="$gettext(text)" />
        <dl v-if="listItems.length" class="info-list">
          <component
            :is="item.headline ? 'dt' : 'dd'"
            v-for="(item, index) in listItems"
            :key="index"
          >
            {{ $gettext(item.text) }}
          </component>
        </dl>
        <p v-if="endText" class="info-text-end" v-text="$gettext(endText)" />
        <oc-button
          v-if="readMoreLink"
          type="a"
          appearance="raw"
          size="small"
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

<script lang="ts">
// this needs to be non-script-setup so we can use FocusTrap in unit tests
import { FocusTrap } from 'focus-trap-vue'

export default {
  components: { FocusTrap }
}
</script>

<style lang="scss">
.oc-info-drop {
  display: inline-block;
  .oc-button {
    vertical-align: middle;
  }
  .info-drop-content {
    font-size: var(--oc-font-size-medium);
  }
  .info-more-link {
    font-size: var(--oc-font-size-medium) !important;
  }
  .info-header {
    align-items: center;
  }
  .info-title {
    font-size: 1.125rem;
    font-weight: normal;
  }
  .info-list:first-child,
  .info-text:first-child {
    margin-top: 0;
  }
  .info-list:last-child,
  .info-text:last-child {
    margin-bottom: 0;
  }
  .info-list {
    font-weight: bold;
    margin-bottom: var(--oc-space-xsmall);
    margin-top: var(--oc-space-small);
    dt {
      &:first-child {
        margin-top: 0;
      }
    }
    dd {
      margin-left: 0;
      font-weight: normal;
    }
  }
}
</style>
