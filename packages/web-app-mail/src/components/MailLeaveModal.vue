<template>
  <oc-modal v-if="modelValue" :title="$gettext('Leave this screen?')" :hide-actions="true">
    <template #content>
      <p
        class="mb-4"
        v-text="
          $gettext(
            'Your email isn’t finished yet. You can save it as a draft or exit without saving.'
          )
        "
      />
      <div class="flex justify-end gap-2 pt-4">
        <oc-button appearance="filled" :disabled="isSaving || !canSaveDraft" @click="$emit('save')">
          {{ $gettext('Save as draft') }}
        </oc-button>
        <oc-button appearance="outline" :disabled="isSaving" @click="$emit('discard')">
          {{ $gettext('Discard') }}
        </oc-button>
        <oc-button
          appearance="outline"
          :disabled="isSaving"
          @click="$emit('update:modelValue', false)"
        >
          {{ $gettext('Cancel') }}
        </oc-button>
      </div>
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'

defineProps<{
  modelValue: boolean
  isSaving: boolean
  canSaveDraft: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save'): void
  (e: 'discard'): void
}>()

const { $gettext } = useGettext()
</script>
