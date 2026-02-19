<template>
  <oc-modal v-if="modelValue" :title="$gettext('Leave this screen?')" :hide-actions="true">
    <template #content>
      <p
        class="oc-mb-m"
        v-text="
          $gettext(
            'Your email isn’t finished yet. You can save it as a draft or exit without saving.'
          )
        "
      />
      <div class="oc-modal-body-actions flex justify-end p-4 text-right -mr-4 -mb-4 -ml-4">
        <div class="oc-modal-body-actions-grid grid grid-flow-col auto-cols-1fr gap-2">
          <oc-button
            class="oc-modal-body-actions-confirm"
            appearance="filled"
            :disabled="isSaving || !canSaveDraft"
            @click="$emit('save')"
          >
            {{ $gettext('Save as draft') }}
          </oc-button>
          <oc-button
            class="oc-modal-body-actions-secondary"
            appearance="outline"
            :disabled="isSaving"
            @click="$emit('discard')"
          >
            {{ $gettext('Discard') }}
          </oc-button>
          <oc-button
            class="oc-modal-body-actions-cancel"
            appearance="outline"
            :disabled="isSaving"
            @click="$emit('update:modelValue', false)"
          >
            {{ $gettext('Cancel') }}
          </oc-button>
        </div>
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
