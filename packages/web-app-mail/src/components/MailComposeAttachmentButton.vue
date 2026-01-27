<template>
  <div class="relative inline-flex">
    <input ref="fileInput" class="hidden" type="file" multiple @change="onFileChange" />
    <oc-button
      :id="mobileToggleId"
      type="button"
      class="md:hidden h-9 w-9 rounded-full p-0"
      :aria-label="$gettext('Add attachment')"
      :title="$gettext('Add attachment')"
    >
      <oc-icon name="attachment-2" fill-type="none" class="text-base text-role-on-surface" />
    </oc-button>
    <oc-button
      type="button"
      class="hidden md:inline-flex h-9 w-9 rounded-full p-0"
      :aria-label="$gettext('Add attachment')"
      :title="$gettext('Add attachment')"
      @click="openPicker"
    >
      <oc-icon name="attachment-2" fill-type="none" class="text-base text-role-on-surface" />
    </oc-button>
    <oc-drop
      :toggle="`#${mobileToggleId}`"
      :title="$gettext('Add attachment')"
      :close-on-click="true"
    >
      <ul class="flex flex-col">
        <li>
          <oc-button appearance="raw" class="w-full" @click="openPicker">
            <span v-text="$gettext('Attach file')" />
          </oc-button>
        </li>
      </ul>
    </oc-drop>
  </div>
</template>

<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useMessages } from '@opencloud-eu/web-pkg'
import type { MailComposeAttachment } from './MailComposeForm.vue'
import { useSaveAttachment } from '../composables/useSaveAttachment'

const { $gettext } = useGettext()
const { showErrorMessage } = useMessages()
const { saveAttachment } = useSaveAttachment()

const props = defineProps<{
  modelValue?: MailComposeAttachment[]
  accountId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: MailComposeAttachment[]): void
}>()

const fileInput = useTemplateRef('fileInput')
const mobileToggleId = `mail-compose-attach-toggle-${useId()}`

const openPicker = () => {
  fileInput.value?.click()
}

const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''

  if (!files.length) {
    return
  }

  if (!props.accountId) {
    showErrorMessage({ title: $gettext('Please select a sender account first') })
    return
  }

  const next = [...(props.modelValue ?? [])]

  for (const file of files) {
    try {
      const uploaded = await saveAttachment(props.accountId, file)
      next.push({
        id: uploaded.blobId,
        blobId: uploaded.blobId,
        name: file.name,
        type: uploaded.type || file.type || 'application/octet-stream',
        disposition: 'attachment',
        size: uploaded.size ?? file.size
      })
    } catch (err) {
      showErrorMessage({
        title: $gettext('Failed to upload %{name}', { name: file.name }),
        errors: [err]
      })
    }
  }

  emit('update:modelValue', next)
}
</script>
