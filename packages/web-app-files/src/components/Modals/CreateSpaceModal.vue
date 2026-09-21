<template>
  <form autocomplete="off" @submit.prevent="onPrimaryAction">
    <template v-if="step === 'name'">
      <div v-if="!showOptions" class="flex justify-end mb-1">
        <oc-button
          class="create-space-options-toggle"
          gap-size="xsmall"
          appearance="raw"
          no-hover
          @click="showOptions = true"
        >
          <oc-icon name="settings-3" size-class="size-4" fill-type="fill" />
          <span v-text="$gettext('Options')" />
        </oc-button>
      </div>
      <div class="mb-2 flex flex-row items-center gap-3">
        <!-- Doubles as the preview for the picked image, so the options don't
             need one of their own. A space image is 16:9, like the crop it
             comes from. An encrypted space gets no image. -->
        <div
          v-if="showOptions"
          class="w-28 aspect-video shrink-0 flex items-center justify-center overflow-hidden rounded bg-role-surface-container-highest"
        >
          <oc-image
            v-if="imageUrl && !encrypt"
            :src="imageUrl"
            :alt="$gettext('Selected space image')"
            class="w-full h-full object-cover"
          />
          <resource-icon
            v-else
            :resource="{ type: 'space', driveType: 'project', isInVault: encrypt } as SpaceResource"
            size-class="size-10"
            class="rounded-sm"
          />
        </div>
        <oc-text-input
          id="create-space-input"
          v-model="spaceName"
          class="min-w-0 grow"
          :label="$gettext('Space name')"
          required-mark
          :error-message="errorMessage"
          :fix-message-line="true"
        />
      </div>
      <div v-if="vaultCreation" data-testid="create-space-encrypt">
        <oc-switch
          v-model:checked="encrypt"
          :label="$gettext('End-to-end encrypt this space')"
          class="inline-flex flex-row-reverse [&>span:first-child]:flex-row-reverse [&>span:first-child]:ml-2"
        >
          <oc-icon
            :name="encrypt ? 'lock-2' : 'lock-unlock'"
            fill-type="line"
            size-class="size-5"
          />
        </oc-switch>
        <p
          class="mt-1 mb-0 ml-12 text-sm text-role-on-surface-variant"
          v-text="
            $gettext(
              'Extra secure: unreadable without an extra password. Lose it and the files are lost too. Collaboration features are limited.'
            )
          "
        />
      </div>
      <create-space-options
        v-if="showOptions"
        v-model:quota="quota"
        v-model:subtitle="subtitle"
        v-model:description="description"
        v-model:image="image"
        v-model:members="members"
        v-model:member-role-id="memberRoleId"
        :encrypted="encrypt"
      />
    </template>
    <component
      :is="vaultCreation!.setupComponent"
      v-else
      ref="setupComponent"
      :vault-name="spaceName"
      is-space
      @update:valid="setupValid = $event"
    />

    <!-- The modal body scrolls, so the actions are pinned to its bottom edge. -->
    <div class="sticky bottom-0 -mx-4 flex justify-end items-center bg-role-surface px-4 pt-4">
      <div class="oc-modal-body-actions-grid">
        <oc-button
          v-if="step === 'setup'"
          class="oc-modal-body-actions-cancel ml-2"
          @click="step = 'name'"
        >
          {{ $gettext('Back') }}
        </oc-button>
        <oc-button
          class="oc-modal-body-actions-confirm ml-2"
          appearance="filled"
          submit="submit"
          :disabled="primaryDisabled"
        >
          {{ encrypt && step === 'name' ? $gettext('Continue') : $gettext('Create') }}
        </oc-button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { useObjectUrl } from '@vueuse/core'
import { useGettext } from 'vue3-gettext'
import { isProjectSpaceResource, type SpaceResource } from '@opencloud-eu/web-client'
import {
  getVaultCreator,
  ResourceIcon,
  resolveFileNameDuplicate,
  useCreateSpace,
  useExtensionRegistry,
  useIsResourceNameValid,
  useModals,
  useSpacesStore,
  type Modal,
  type SpaceMemberInvite,
  type VaultFinalize
} from '@opencloud-eu/web-pkg'
import CreateSpaceOptions from './CreateSpace/CreateSpaceOptions.vue'

const { modal } = defineProps<{
  modal: Modal
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
}>()

const { $gettext } = useGettext()
const { isSpaceNameValid } = useIsResourceNameValid()
const { updateModal } = useModals()
const { addNewSpace } = useCreateSpace()
const extensionRegistry = useExtensionRegistry()

const vaultCreation = computed(() => getVaultCreator(extensionRegistry)?.creation)

const setupComponent = ref<{ finalize: VaultFinalize }>()
const step = ref<'name' | 'setup'>('name')
const encrypt = ref(false)
const setupValid = ref(false)
// Spaces may share a name, so counting up is a suggestion, not a constraint.
const suggestedName = $gettext('New space')
const projectSpaces = useSpacesStore().spaces.filter(isProjectSpaceResource)
const spaceName = ref(
  projectSpaces.some(({ name }) => name === suggestedName)
    ? resolveFileNameDuplicate(suggestedName, '', projectSpaces)
    : suggestedName
)

const showOptions = ref(false)
const quota = ref(0)
const subtitle = ref('')
const description = ref('')
const image = ref<ArrayBuffer>(null)
const imageUrl = useObjectUrl(
  computed(() => (unref(image) ? new Blob([unref(image)], { type: 'image/png' }) : null))
)
const members = ref<SpaceMemberInvite[]>([])
const memberRoleId = ref('')

const errorMessage = computed(() => isSpaceNameValid(unref(spaceName)).error)
const inputValid = computed(() =>
  unref(step) === 'setup' ? unref(setupValid) : !unref(errorMessage)
)
const primaryDisabled = computed(() => !unref(inputValid) || modal.isLoading)

// Going back unmounts the setup step, so its input is gone - drop the validity
// it reported with it.
watch(step, (value) => {
  if (value === 'name') {
    setupValid.value = false
  }
})

// Only the options need the extra room.
watch([step, showOptions], ([currentStep, optionsShown]) => {
  updateModal(
    modal.id,
    'elementClass',
    currentStep === 'name' && optionsShown ? '!max-w-4xl' : undefined
  )
})

function onPrimaryAction() {
  if (unref(primaryDisabled)) {
    return
  }
  if (unref(encrypt) && unref(step) === 'name') {
    step.value = 'setup'
    return
  }
  // Routed through the wrapper rather than calling onConfirm directly: that's
  // what shows the loading state and closes the modal afterwards.
  emit('confirm')
}

async function onConfirm() {
  // Guards the confirm path the modal wrapper drives, which can't know about
  // the second step. Checks `inputValid` rather than `primaryDisabled`: the
  // wrapper flips `isLoading` on before it calls us.
  if (!unref(inputValid) || (unref(encrypt) && unref(step) === 'name')) {
    return Promise.reject()
  }
  // A vault space is encrypted all the way down, so it gets neither a readme
  // nor an image - both would end up as plain text next to the encrypted files.
  await addNewSpace(unref(spaceName), {
    encrypt: unref(encrypt),
    finalizeVault: unref(setupComponent)?.finalize,
    quota: unref(quota) || undefined,
    subtitle: unref(subtitle) || undefined,
    description: (!unref(encrypt) && unref(description)) || undefined,
    image: (!unref(encrypt) && unref(image)) || undefined,
    members: unref(members)
  })
}

defineExpose({ onConfirm })
</script>
