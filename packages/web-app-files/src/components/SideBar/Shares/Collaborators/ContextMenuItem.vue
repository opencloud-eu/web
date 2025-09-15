<template>
  <div v-if="option.hasSwitch" class="item-has-switch p-2 flex justify-center">
    <oc-icon :name="option.icon" fill-type="line" size="medium" />
    <oc-switch
      class="ml-2 flex w-full"
      :checked="option.isChecked.value"
      :class="option.class"
      :label="option.title"
      @update:checked="option.method"
    />
  </div>
  <oc-button
    v-else
    appearance="raw"
    class="p-2"
    :class="option.class"
    justify-content="left"
    :type="option.to ? 'router-link' : 'button'"
    :to="option.to"
    v-bind="option.additionalAttributes || {}"
    @click="option.method"
  >
    <oc-icon :name="option.icon" fill-type="line" size="medium" />
    <span v-text="option.title" />
  </oc-button>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { EditOption } from './EditDropdown.vue'

export default defineComponent({
  name: 'ContextMenuItem',
  props: {
    option: {
      type: Object as PropType<EditOption>,
      required: true
    }
  }
})
</script>
