<template>
  <div>
    <div class="flex items-start gap-3">
      <oc-icon name="resource-type-vault" fill-type="fill" size-class="size-8" />
      <div>
        <p
          class="mt-0 mb-1 font-semibold"
          v-text="$gettext('%{vaultName} is end-to-end encrypted', { vaultName: displayName })"
        />
        <p class="m-0 text-sm">
          <span
            v-text="
              $gettext(
                'Set the password that unlocks it. OpenCloud cannot recover it. Without the password the files are lost, so keep it in a password manager.'
              )
            "
          />
          <oc-contextual-helper class="pl-1 align-middle" v-bind="passphraseHelper" />
        </p>
      </div>
    </div>
    <oc-text-input
      id="vault-setup-passphrase"
      ref="passphraseInput"
      v-model="passphrase"
      class="mt-4"
      type="password"
      :label="$gettext('Password')"
      required-mark
      :error-message="errorMessage"
      :fix-message-line="true"
      autocomplete="new-password"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, unref, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  useClientService,
  useResourcesStore,
  withoutExtension,
  type FolderVaultFinalize
} from '@opencloud-eu/web-pkg'
import { createEngine } from '../crypto/engine'
import { writeIntegrityToken } from '../integrity'
import { VAULT_FOLDER_EXTENSION } from '../vaultPath'

const { vaultName, errorMessage = undefined } = defineProps<{
  /** Cleartext name of the vault about to be created, e.g. `Project archive.vault`. */
  vaultName: string
  /** Error to surface on the password field, e.g. a password the vault rejected. */
  errorMessage?: string
}>()

const emit = defineEmits<{
  (e: 'update:valid', value: boolean): void
}>()

const { $gettext } = useGettext()
const clientService = useClientService()
const resourcesStore = useResourcesStore()

// Match what the file list shows: hide the vault marker while extensions are hidden.
const displayName = computed(() =>
  resourcesStore.areFileExtensionsShown
    ? vaultName
    : withoutExtension(vaultName, VAULT_FOLDER_EXTENSION)
)

const passphraseInput = useTemplateRef<{ focus: () => void }>('passphraseInput')
const passphrase = defineModel<string>({ default: '' })

const passphraseHelper = computed(() => ({
  title: $gettext('End-to-end encryption'),
  text: $gettext(
    'Files in this vault are encrypted on your device before upload. The key is derived from your password and never leaves your device, so the server only ever holds encrypted data.'
  ),
  list: [
    {
      text: $gettext(
        'That means nobody can unlock the vault without the password. Not OpenCloud, not your administrator, not anyone with access to the server or its backups.'
      )
    },
    {
      text: $gettext(
        'There is no reset link, no security question and no admin override. If the password is lost, the encrypted files remain on the server but can never be read again and can be considered lost.'
      )
    }
  ],
  endText: $gettext(
    'Save the password in a password manager, or write it down and keep it somewhere safe. Use a password you will still recognize in a year.'
  )
}))

watch(
  passphrase,
  () => {
    emit('update:valid', !!unref(passphrase))
  },
  { immediate: true }
)

onMounted(() => {
  unref(passphraseInput)?.focus?.()
})

/**
 * Called by the create-folder flow once the vault folder exists on the server.
 * Create the integrity token and write it to the vault root, so the vault can be
 * unlocked later.
 */
const finalize: FolderVaultFinalize = async (space, vaultRoot) => {
  await writeIntegrityToken(
    { webdav: clientService.webdav, space, vaultRoot },
    createEngine(vaultRoot, unref(passphrase))
  )
}

defineExpose({ finalize })
</script>
