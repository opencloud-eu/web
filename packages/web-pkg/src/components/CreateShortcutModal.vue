<template>
  <shortcut-target-input
    :model-value="inputUrl"
    @update:model-value="onInputUrl"
    @select="onSelectTarget"
  />
  <div v-show="inputUrl || inputFilename" class="flex w-full mt-4">
    <oc-text-input
      id="create-shortcut-modal-filename-input"
      :model-value="inputFilename"
      :label="$gettext('Shortcut name')"
      class="w-full"
      :error-message="inputFileNameErrorMessage"
      :fix-message-line="true"
      @update:model-value="onInputFilename"
    >
      <template #label>
        <div class="flex items-center mb-1">
          <label for="create-shortcut-modal-filename-input">
            {{ $gettext('Shortcut name') }}
            <span class="text-role-error" aria-hidden="true">*</span>
          </label>
          <oc-contextual-helper
            :text="$gettext('Shortcut name as it will appear in the file list.')"
            :title="$gettext('Shortcut name')"
            class="ml-1"
          />
        </div>
      </template>
    </oc-text-input>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { Resource, SpaceResource, urlJoin } from '@opencloud-eu/web-client'
import {
  Modal,
  useClientService,
  useIsResourceNameValid,
  useMessages,
  useResourcesStore
} from '../composables'
import { useGettext } from 'vue3-gettext'
import { getShortcutUrl, resolveFileNameDuplicate } from '../helpers'
import { storeToRefs } from 'pinia'
import ShortcutTargetInput from './ShortcutTargetInput.vue'

const { space } = defineProps<{
  modal: Modal
  space: SpaceResource
}>()

const emit = defineEmits<{
  (e: 'update:confirmDisabled', value: boolean): void
}>()

const clientService = useClientService()
const { $gettext } = useGettext()
const { showMessage, showErrorMessage } = useMessages()
const { isFileNameValid } = useIsResourceNameValid()
const resourcesStore = useResourcesStore()
const { resources, currentFolder } = storeToRefs(resourcesStore)
const inputUrl = ref('')
const inputFilename = ref('')
const isFilenameEdited = ref(false)
const shortcutUrl = computed(() => getShortcutUrl(unref(inputUrl)))

const inputFilenameValidation = computed(() => {
  const name = `${unref(inputFilename)}.url`
  const resource = {
    path: urlJoin(unref(currentFolder)?.path || '/', name),
    name,
    extension: 'url'
  } as Resource
  return isFileNameValid(resource, name, unref(resources))
})
const inputFileNameErrorMessage = computed(() => unref(inputFilenameValidation).error || '')
const confirmButtonDisabled = computed(
  () => !unref(shortcutUrl) || !unref(inputFilename) || !unref(inputFilenameValidation).isValid
)
watch(confirmButtonDisabled, (disabled) => emit('update:confirmDisabled', disabled), {
  immediate: true
})

function onInputUrl(value: string) {
  inputUrl.value = value
  const url = unref(shortcutUrl)
  suggestFilename(url ? new URL(url).host : '')
}

function onSelectTarget(url: string, name: string) {
  inputUrl.value = url
  suggestFilename(name)
}

function onInputFilename(value: string) {
  inputFilename.value = value
  isFilenameEdited.value = true
}

function suggestFilename(name: string) {
  if (unref(isFilenameEdited)) {
    return
  }
  const filename = `${name}.url`
  inputFilename.value =
    name && unref(resources).some((resource) => resource.name === filename)
      ? resolveFileNameDuplicate(filename, 'url', unref(resources)).slice(0, -4)
      : name
}

async function onConfirm() {
  if (unref(confirmButtonDisabled)) {
    return
  }
  try {
    const resource = await clientService.webdav.putFileContents(space, {
      path: urlJoin(unref(currentFolder).path, `${unref(inputFilename)}.url`),
      content: `[InternetShortcut]\nURL=${unref(shortcutUrl)}`
    })
    resourcesStore.upsertResource(resource)
    showMessage({ title: $gettext('Shortcut was created successfully') })
  } catch (error) {
    console.error(error)
    showErrorMessage({ title: $gettext('Failed to create shortcut'), errors: [error] })
  }
}

defineExpose({ onConfirm })
</script>
