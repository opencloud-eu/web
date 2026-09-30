<template>
  <form autocomplete="off" @submit.prevent="emit('confirm')">
    <oc-text-input
      id="create-group-input-display-name"
      v-model="group.displayName"
      class="mb-2"
      :label="$gettext('Group name')"
      :error-message="formData.displayName.errorMessage"
      :fix-message-line="true"
      required-mark
      @update:model-value="validateDisplayName"
    />
    <input type="submit" class="hidden" />
  </form>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import { computed, ref, unref, watch } from 'vue'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { Modal, useClientService, useMessages } from '@opencloud-eu/web-pkg'
import { useGroupSettingsStore } from '../../composables/stores/groupSettings'

defineProps<{ modal: Modal }>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'update:confirmDisabled', value: boolean): void
}>()

const { $gettext } = useGettext()
const { showMessage, showErrorMessage } = useMessages()
const clientService = useClientService()
const groupSettingsStore = useGroupSettingsStore()

const group = ref<Group>({ displayName: '' })
const formData = ref({
  displayName: {
    errorMessage: '',
    valid: false
  }
})

const isFormInvalid = computed(() => Object.values(unref(formData)).some((v) => !v.valid))

watch(
  isFormInvalid,
  () => {
    emit('update:confirmDisabled', unref(isFormInvalid))
  },
  { immediate: true }
)

function setDisplayNameError(errorMessage: string) {
  formData.value.displayName.errorMessage = errorMessage
  formData.value.displayName.valid = false
  return false
}

async function validateDisplayName() {
  const { displayName } = unref(group)

  if (displayName.trim() === '') {
    return setDisplayNameError($gettext('Group name cannot be empty'))
  }

  if (displayName.length > 255) {
    return setDisplayNameError($gettext('Group name cannot exceed 255 characters'))
  }

  try {
    await clientService.graphAuthenticated.groups.getGroup(displayName)
    return setDisplayNameError(
      $gettext('Group "%{groupName}" already exists', { groupName: displayName })
    )
  } catch {}

  formData.value.displayName.errorMessage = ''
  formData.value.displayName.valid = true
  return true
}

async function onConfirm() {
  if (unref(isFormInvalid)) {
    return Promise.reject()
  }

  try {
    const createdGroup = await clientService.graphAuthenticated.groups.createGroup(unref(group))
    showMessage({ title: $gettext('Group was created successfully') })
    groupSettingsStore.upsertGroup(createdGroup)
  } catch (error) {
    console.error(error)
    showErrorMessage({
      title: $gettext('Failed to create group'),
      errors: [error]
    })
  }
}

defineExpose({ onConfirm })
</script>
