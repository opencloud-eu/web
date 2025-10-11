<template>
  <div id="user-group-select-form">
    <oc-select
      :model-value="selectedOptions"
      class="mb-2"
      :multiple="true"
      :options="groupOptions"
      option-label="displayName"
      :label="$gettext('Groups')"
      :fix-message-line="true"
      v-bind="$attrs"
      :required-mark="requiredMark"
      @update:model-value="onUpdate"
    >
      <template #selected-option="{ displayName, id }">
        <span class="flex justify-center">
          <avatar-image
            class="flex self-center mr-2"
            :width="16.8"
            :userid="id"
            :user-name="displayName"
          />
          <span>{{ displayName }}</span>
        </span>
      </template>
      <template #option="{ displayName, id }">
        <div class="flex">
          <span class="flex justify-center">
            <avatar-image
              class="flex self-center mr-2"
              :width="16.8"
              :userid="id"
              :user-name="displayName"
            />
            <span>{{ displayName }}</span>
          </span>
        </div>
      </template>
    </oc-select>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, PropType, ref, unref, watch } from 'vue'
import { Group } from '@opencloud-eu/web-client/graph/generated'

export default defineComponent({
  name: 'GroupSelect',
  props: {
    selectedGroups: {
      type: Array as PropType<Group[]>,
      required: true
    },
    groupOptions: {
      type: Array as PropType<Group[]>,
      required: true
    },
    requiredMark: {
      type: Boolean,
      default: false,
      required: false
    }
  },
  emits: ['selectedOptionChange'],
  setup(props, { emit }) {
    const selectedOptions = ref<(Group[] | Group) & { readonly?: boolean }>([])
    const onUpdate = (group: Group) => {
      selectedOptions.value = group
      emit('selectedOptionChange', unref(selectedOptions))
    }

    const currentGroups = computed(() => props.selectedGroups)
    watch(
      currentGroups,
      () => {
        selectedOptions.value = props.selectedGroups
          .map((g) => ({
            ...g,
            readonly: g.groupTypes?.includes('ReadOnly')
          }))
          .sort((a: any, b: any) => b.readonly - a.readonly)
      },
      { immediate: true }
    )

    return { selectedOptions, onUpdate }
  }
})
</script>
