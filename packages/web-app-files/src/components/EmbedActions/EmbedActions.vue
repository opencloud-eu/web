<template>
  <section
    class="relative w-full flex flex-wrap items-center justify-between my-2 text-role-on-chrome gap-2"
  >
    <oc-text-input
      v-if="chooseFileName"
      v-model="fileName"
      class="flex flex-row items-center ml-0 md:ml-[230px] gap-2 [&_input]:w-auto md:[&_input]:w-sm"
      :selection-range="fileNameInputSelectionRange"
      :label="$gettext('File name')"
      :error-message="fileNameErrorMessage"
      :fix-message-line="true"
    />

    <div class="flex items-center ml-auto">
      <oc-button class="mr-4" data-testid="button-cancel" appearance="outline" @click="emitCancel">
        {{ $gettext('Cancel') }}
      </oc-button>
      <oc-button
        v-if="!isLocationPicker && !isFilePicker"
        key="btn-share"
        class="mr-4"
        data-testid="button-share"
        appearance="filled"
        :disabled="isShareLinksButtonDisabled"
        @click="createLinkAction.handler({ resources: selectedFiles, space })"
      >
        {{ $gettext('Share link(s)') }}
      </oc-button>
      <template v-if="!isFilePicker">
        <oc-button
          v-if="isLocationPicker"
          data-testid="button-select"
          appearance="filled"
          :disabled="isChooseButtonDisabled"
          @click="emitSelect"
        >
          {{ locationPickerSubmitButtonLabel }}
        </oc-button>
        <oc-button
          v-else
          data-testid="button-select"
          appearance="filled"
          :disabled="isAttachAsCopyButtonDisabled"
          @click="emitSelect"
        >
          {{ $gettext('Attach as copy') }}
        </oc-button>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, unref } from 'vue'
import {
  embedModeLocationPickMessageData,
  FileAction,
  routeToContextQuery,
  useEmbedMode,
  useIsResourceNameValid,
  useResourcesStore,
  useRouter,
  useSpacesStore,
  withExtension,
  withoutExtension
} from '@opencloud-eu/web-pkg'
import { extractExtensionFromFile, Resource } from '@opencloud-eu/web-client'
import { join } from 'path'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { useFileActionsCreateLink } from '../../composables'

const { $gettext } = useGettext()
const {
  isLocationPicker,
  isFilePicker,
  postMessage,
  chooseFileName,
  chooseFileNameSuggestion,
  submitButtonTitle
} = useEmbedMode()
const spacesStore = useSpacesStore()
const router = useRouter()
const { currentSpace: space } = storeToRefs(spacesStore)
const resourcesStore = useResourcesStore()
const { currentFolder, selectedResources, areFileExtensionsShown } = storeToRefs(resourcesStore)
const { isFileNameValid } = useIsResourceNameValid()

const suggestedFileName = unref(chooseFileNameSuggestion) || ''
// taken from the suggestion, hidden in the input while file extensions are turned off
const fileNameExtension = extractExtensionFromFile({ name: suggestedFileName } as Resource)

const isFileNameExtensionHidden = computed(
  () => !!fileNameExtension && !unref(areFileExtensionsShown)
)

const fileName = ref(
  unref(isFileNameExtensionHidden)
    ? withoutExtension(suggestedFileName, fileNameExtension)
    : suggestedFileName
)
const fullFileName = computed(() =>
  unref(isFileNameExtensionHidden)
    ? withExtension(unref(fileName), fileNameExtension)
    : unref(fileName)
)

const fileNameErrorMessage = computed(() => {
  if (!unref(chooseFileName) || !unref(currentFolder)) {
    return undefined
  }
  const name = unref(fullFileName)
  const resource = { path: join(unref(currentFolder).path, name), name } as Resource
  // no existing resources to check against, name conflicts get resolved on save
  const { isValid, error } = isFileNameValid(resource, name, [])
  return isValid ? undefined : error
})

const selectedFiles = computed<Resource[]>(() => {
  if (isLocationPicker.value) {
    return [unref(currentFolder)]
  }

  return unref(selectedResources)
})

const { actions: createLinkActions } = useFileActionsCreateLink({ enforceModal: true })
const createLinkAction = computed<FileAction>(() => unref(createLinkActions)[0])

const isAttachAsCopyButtonDisabled = computed<boolean>(() => selectedFiles.value.length < 1)

const isShareLinksButtonDisabled = computed<boolean>(
  () =>
    selectedFiles.value.length < 1 ||
    !unref(createLinkAction).isVisible({
      resources: unref(selectedFiles),
      space: unref(space)
    })
)

const isChooseButtonDisabled = computed<boolean>(() => {
  return (
    selectedFiles.value.length < 1 ||
    !unref(currentFolder) ||
    !unref(currentFolder)?.canCreate() ||
    (unref(chooseFileName) && !unref(fileName)) ||
    !!unref(fileNameErrorMessage)
  )
})

const fileNameInputSelectionRange = computed<[number, number] | null>(() => {
  if (!unref(chooseFileName) || !fileNameExtension || unref(isFileNameExtensionHidden)) {
    return null
  }
  return [0, withoutExtension(suggestedFileName, fileNameExtension).length]
})

const locationPickerSubmitButtonLabel = computed(() => {
  return unref(submitButtonTitle) || (unref(chooseFileName) ? $gettext('Save') : $gettext('Choose'))
})

const emitSelect = (): void => {
  if (unref(chooseFileName)) {
    postMessage<embedModeLocationPickMessageData>('opencloud-embed:select', {
      resources: JSON.parse(JSON.stringify(selectedFiles.value)),
      fileName: unref(fullFileName),
      locationQuery: JSON.parse(JSON.stringify(routeToContextQuery(unref(router.currentRoute))))
    })
    return
  }

  // TODO: adjust type to embedModeLocationPickMessageData later (breaking)
  postMessage<Resource[]>('opencloud-embed:select', JSON.parse(JSON.stringify(selectedFiles.value)))
}

const emitCancel = (): void => {
  postMessage<null>('opencloud-embed:cancel', null)
}
</script>
