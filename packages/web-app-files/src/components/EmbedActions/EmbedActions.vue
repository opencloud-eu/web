<template>
  <section
    class="relative z-[calc(var(--z-index-modal)+2)] w-full flex flex-wrap items-center justify-between my-2 text-role-on-chrome gap-2"
  >
    <oc-text-input
      v-if="chooseFileName"
      v-model="fileName"
      class="flex flex-row items-center ml-0 md:ml-[230px] gap-2 [&_input]:w-auto md:[&_input]:w-sm"
      :selection-range="fileNameInputSelectionRange"
      :label="$gettext('File name')"
    />

    <div class="flex items-center ml-auto">
      <oc-button
        class="mr-4"
        data-testid="button-cancel"
        appearance="raw-inverse"
        no-hover
        @click="emitCancel"
      >
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
          {{ $gettext('Choose') }}
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

<script lang="ts">
import { computed, defineComponent, ref, unref } from 'vue'
import {
  embedModeLocationPickMessageData,
  FileAction,
  routeToContextQuery,
  useAbility,
  useEmbedMode,
  useFileActionsCreateLink,
  useResourcesStore,
  useRouter,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

export default defineComponent({
  setup() {
    const ability = useAbility()
    const { $gettext } = useGettext()
    const {
      isLocationPicker,
      isFilePicker,
      postMessage,
      chooseFileName,
      chooseFileNameSuggestion
    } = useEmbedMode()
    const spacesStore = useSpacesStore()
    const router = useRouter()
    const { currentSpace: space } = storeToRefs(spacesStore)
    const resourcesStore = useResourcesStore()
    const { currentFolder, selectedResources } = storeToRefs(resourcesStore)
    const fileName = ref(unref(chooseFileNameSuggestion))

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
        !unref(currentFolder)?.canCreate()
      )
    })

    const canCreatePublicLinks = computed<boolean>(() => ability.can('create-all', 'PublicLink'))

    const fileNameInputSelectionRange = computed(() => {
      return [0, unref(fileName).split('.')[0].length] as [number, number]
    })

    const emitSelect = (): void => {
      if (unref(chooseFileName)) {
        postMessage<embedModeLocationPickMessageData>('opencloud-embed:select', {
          resources: JSON.parse(JSON.stringify(selectedFiles.value)),
          fileName: unref(fileName),
          locationQuery: JSON.parse(JSON.stringify(routeToContextQuery(unref(router.currentRoute))))
        })
      }

      // TODO: adjust type to embedModeLocationPickMessageData later (breaking)
      postMessage<Resource[]>(
        'opencloud-embed:select',
        JSON.parse(JSON.stringify(selectedFiles.value))
      )
    }

    const emitCancel = (): void => {
      postMessage<null>('opencloud-embed:cancel', null)
    }

    return {
      chooseFileName,
      chooseFileNameSuggestion,
      selectedFiles,
      isAttachAsCopyButtonDisabled,
      isShareLinksButtonDisabled,
      isChooseButtonDisabled,
      canCreatePublicLinks,
      isLocationPicker,
      isFilePicker,
      emitCancel,
      emitSelect,
      space,
      createLinkAction,
      fileName,
      fileNameInputSelectionRange
    }
  }
})
</script>
