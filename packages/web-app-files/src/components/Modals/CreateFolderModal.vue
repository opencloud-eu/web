<template>
  <form autocomplete="off" @submit.prevent="onPrimaryAction">
    <template v-if="step === 'name'">
      <oc-text-input
        id="create-folder-input"
        v-model="folderName"
        :label="$gettext('Folder name')"
        required-mark
        :error-message="errorMessage"
        :fix-message-line="true"
        @update:model-value="nameTouched = true"
      />
      <div v-if="canEncrypt" data-testid="create-folder-encrypt">
        <oc-switch
          v-model:checked="encrypt"
          :label="$gettext('End-to-end encrypt this folder')"
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
    </template>
    <component
      :is="vaultCreation.setupComponent"
      v-else
      ref="setupComponent"
      :vault-name="serverName"
      @update:valid="setupValid = $event"
    />

    <div class="flex justify-end items-center mt-4">
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
import { useGettext } from 'vue3-gettext'
import { join } from 'path'
import { storeToRefs } from 'pinia'
import type { Resource } from '@opencloud-eu/web-client'
import {
  resolveFileNameDuplicate,
  useIsResourceNameValid,
  useResourcesStore,
  withExtension,
  withoutExtension
} from '@opencloud-eu/web-pkg'
import type { FolderVaultCreation, FolderVaultFinalize, Modal } from '@opencloud-eu/web-pkg'

const {
  modal,
  vaultCreation = undefined,
  callbackFn
} = defineProps<{
  modal: Modal
  /**
   * Creation bits of the folder-vault extension that would claim the new folder:
   * its setup UI and the folder extension it marks vault roots with. Absent when
   * no extension can create vaults, hence hide the encryption switch.
   */
  vaultCreation?: FolderVaultCreation
  callbackFn: (
    folderName: string,
    options: { encrypt: boolean; finalizeVault?: FolderVaultFinalize }
  ) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
}>()

const { $gettext } = useGettext()
const { isFileNameValid } = useIsResourceNameValid()
const { resources, currentFolder, areFileExtensionsShown } = storeToRefs(useResourcesStore())

const setupComponent = ref<{ finalize: FolderVaultFinalize }>()
const step = ref<'name' | 'setup'>('name')
const encrypt = ref(false)
const setupValid = ref(false)
// Once the user edits the name we stop re-suggesting: typing a name that is
// taken has to surface the error, not be silently renumbered.
const nameTouched = ref(false)

const baseName = $gettext('New folder')

// The vault marker is the scheme's, never ours - without a scheme there is
// nothing to encrypt with and these are no-ops.
function vaultName(name: string): string {
  return vaultCreation ? withExtension(name, vaultCreation.folderExtension) : name
}

function plainName(name: string): string {
  return vaultCreation ? withoutExtension(name, vaultCreation.folderExtension) : name
}

/**
 * `baseName`, numbered up until it's free for the mode we're about to create in.
 * Only names in the same namespace collide, so `New folder` and `New folder.vault`
 * can happily coexist.
 */
function suggestName(encrypting: boolean): string {
  const siblings = unref(resources)
  const wanted = encrypting ? vaultName(baseName) : baseName
  if (!siblings.some((r) => r.name === wanted)) {
    return baseName
  }
  return plainName(
    resolveFileNameDuplicate(wanted, encrypting ? vaultCreation.folderExtension : '', siblings)
  )
}

function displayName(base: string, encrypting: boolean): string {
  return encrypting && unref(areFileExtensionsShown) ? vaultName(base) : base
}

const folderName = ref(displayName(suggestName(false), false))

const canEncrypt = computed(() => !!vaultCreation)

// The name that actually lands on the server: a vault root always carries the
// scheme's marker, so that's what gets validated - toggling the switch can make
// a name valid or invalid on its own.
const serverName = computed(() =>
  unref(encrypt) ? vaultName(unref(folderName)) : unref(folderName)
)

// Which names are taken depends on the mode, so switching it re-runs the
// suggestion. With file extensions visible the field also shows the vault
// marker; with them hidden it stays out of sight and is only added on create,
// the same way the new-file menu handles extensions.
watch(encrypt, (on) => {
  const base = unref(nameTouched) ? plainName(unref(folderName)) : suggestName(on)
  folderName.value = displayName(base, on)
})

function validate(name: string) {
  const resource = {
    path: join(unref(currentFolder).path, name),
    name,
    isFolder: true
  } as Resource
  return isFileNameValid(resource, name, unref(resources))
}

const errorMessage = computed(() => {
  // Validate what the user typed first so errors point at their input rather
  // than at a marker they never entered.
  const typed = validate(unref(folderName))
  if (!typed.isValid) {
    return typed.error
  }
  if (unref(serverName) === unref(folderName)) {
    return undefined
  }
  return validate(unref(serverName)).error
})

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
  await callbackFn(unref(folderName), {
    encrypt: unref(encrypt),
    finalizeVault: unref(setupComponent)?.finalize
  })
}

defineExpose({ onConfirm })
</script>
