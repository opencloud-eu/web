<template>
  <div id="group-edit-panel" class="flex-1 flex flex-col p-2">
    <form id="group-edit-form" class="flex-1 flex flex-col" autocomplete="off">
      <section class="bg-role-surface-container rounded-xl px-4 pt-3 pb-1">
        <h3 class="font-semibold text-sm mt-0 mb-1" v-text="$gettext('Group')" />
        <oc-text-input
          id="displayName-input"
          v-model="editGroup.displayName"
          :label="$gettext('Group name')"
          :error-message="formData.displayName.errorMessage"
          :fix-message-line="true"
          required-mark
          @update:model-value="validateDisplayName"
        />
      </section>
      <compare-save-dialog
        v-model:saved="saved"
        class="mt-auto pt-4"
        :original-object="group"
        :compare-object="editGroup"
        :confirm-button-disabled="invalidFormData"
        @revert="revertChanges"
        @confirm="onEditGroup(editGroup)"
      ></compare-save-dialog>
    </form>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { CompareSaveDialog, useClientService, useMessages } from '@opencloud-eu/web-pkg'
import { useGroupSettingsStore } from '../../../composables'
import { useGettext } from 'vue3-gettext'

const { group = null } = defineProps<{ group?: Group }>()

const clientService = useClientService()
const { showErrorMessage } = useMessages()
const groupSettingsStore = useGroupSettingsStore()
const { $gettext } = useGettext()

const editGroup = ref<Group>({})
const saved = ref(false)
const formData = ref({
  displayName: {
    errorMessage: '',
    valid: true
  }
})

const invalidFormData = computed(() => {
  return Object.values(unref(formData)).some((v) => !v.valid)
})

async function onEditGroup(editGroup: Group) {
  try {
    const client = clientService.graphAuthenticated
    await client.groups.editGroup(editGroup.id, editGroup)
    const updatedGroup = await client.groups.getGroup(editGroup.id)
    groupSettingsStore.upsertGroup(updatedGroup)
    saved.value = true

    return updatedGroup
  } catch (error) {
    console.error(error)
    showErrorMessage({
      title: $gettext('Failed to edit group'),
      errors: [error]
    })
  }
}

async function validateDisplayName() {
  formData.value.displayName.valid = false

  if (unref(editGroup).displayName.trim() === '') {
    formData.value.displayName.errorMessage = $gettext('Group name cannot be empty')
    return false
  }

  if (unref(editGroup).displayName.length > 255) {
    formData.value.displayName.errorMessage = $gettext('Group name cannot exceed 255 characters')
    return false
  }

  const { displayName } = unref(editGroup)
  if (group.displayName !== displayName) {
    const exists = await clientService.graphAuthenticated.groups.getGroup(displayName).then(
      () => true,
      () => false
    )
    // the name changed while the request was running, the validation of the new name decides
    if (unref(editGroup).displayName !== displayName) {
      return false
    }
    if (exists) {
      formData.value.displayName.errorMessage = $gettext('Group "%{groupName}" already exists', {
        groupName: displayName
      })
      return false
    }
  }

  formData.value.displayName.errorMessage = ''
  formData.value.displayName.valid = true
  return true
}

function revertChanges() {
  editGroup.value = { ...group }
  Object.values(unref(formData)).forEach((formDataValue) => {
    formDataValue.valid = true
    formDataValue.errorMessage = ''
  })
}

watch(
  () => group,
  () => {
    editGroup.value = { ...group }
  },
  { deep: true, immediate: true }
)

watch(
  () => group?.id,
  () => {
    saved.value = false
  }
)
</script>
