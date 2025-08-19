<template>
  <div class="oc-contextual-helper">
    <oc-button
      :id="buttonId"
      :aria-label="$gettext('Show more information')"
      appearance="raw"
      class="align-middle"
      no-hover
    >
      <oc-icon name="question" fill-type="line" size="small" />
    </oc-button>
    <oc-info-drop :drop-id="dropId" :toggle="toggleId" v-bind="props" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { uniqueId } from '../../helpers'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcInfoDrop from '../OcInfoDrop/OcInfoDrop.vue'
import { ContextualHelperDataListItem } from '../../helpers'

export interface Props {
  /**
   * @docs Title of the contextual helper.
   */
  title: string
  /**
   * @docs Text to be displayed at the end.
   */
  endText?: string
  /**
   * @docs List of items to be displayed. Please refer to the component source for the `ContextualHelperDataListItem` type definition.
   */
  list?: ContextualHelperDataListItem[]
  /**
   * @docs Link for external references. Gets labeled with `Read more`.
   */
  readMoreLink?: string
  /**
   * @docs Text to be displayed.
   */
  text?: string
}

const { title, endText = '', list = [], readMoreLink = '', text = '' } = defineProps<Props>()

const dropId = ref(uniqueId('oc-contextual-helper-'))

const buttonId = computed(() => `${dropId.value}-button`)
const toggleId = computed(() => `#${buttonId.value}`)
const props = computed(() => ({ title, text, list, endText, readMoreLink }))
</script>

<style lang="scss">
.oc-contextual-helper {
  display: inline-block;
}
</style>
