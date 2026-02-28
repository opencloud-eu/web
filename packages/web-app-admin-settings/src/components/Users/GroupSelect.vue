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
          <oc-avatar
            :userid="id"
            :user-name="displayName"
            :width="16"
            class="flex self-center mr-2"
          />
          <span>{{ displayName }}</span>
        </span>
      </template>
      <template #option="{ displayName, id }">
        <div class="flex">
          <span class="flex justify-center">
            <oc-avatar
              :userid="id"
              :user-name="displayName"
              :width="16"
              class="flex self-center mr-2"
            />
            <span>{{ displayName }}</span>
          </span>
        </div>
      </template>
    </oc-select>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { Group } from '@opencloud-eu/web-client/graph/generated'

type Option = Group & { readonly?: boolean }

const {
  selectedGroups,
  groupOptions,
  requiredMark = false
} = defineProps<{
  selectedGroups: Group[]
  groupOptions: Group[]
  requiredMark?: boolean
}>()

const emit = defineEmits<{
  (e: 'selectedOptionChange', value: Option[]): void
}>()

const selectedOptions = ref<Option[]>([])
const onUpdate = (group: Option[]) => {
  selectedOptions.value = group
  emit('selectedOptionChange', unref(selectedOptions))
}

const currentGroups = computed(() => selectedGroups)
watch(
  currentGroups,
  () => {
    selectedOptions.value = selectedGroups
      .map((g) => ({
        ...g,
        readonly: g.groupTypes?.includes('ReadOnly')
      }))
      .sort((a: any, b: any) => b.readonly - a.readonly)
  },
  { immediate: true }
)
</script>
