<template>
  <form autocomplete="off" @submit.prevent="onPrimaryAction">
    <template v-if="step === 'name'">
      <oc-text-input
        id="create-space-input"
        v-model="spaceName"
        :label="$gettext('Space name')"
        required-mark
        :error-message="errorMessage"
        :fix-message-line="true"
      />
      <div v-if="canEncrypt" data-testid="create-space-encrypt">
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
    </template>
    <component
      :is="vaultCreation.setupComponent"
      v-else
      ref="setupComponent"
      :vault-name="spaceName"
      is-space
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
import { useIsResourceNameValid } from '../../composables/resources'
import type { VaultCreation, VaultFinalize, Modal } from '../../composables/piniaStores'

const {
  modal,
  vaultCreation = undefined,
  callbackFn
} = defineProps<{
  modal: Modal
  /**
   * Creation bits of the vault extension that would claim the new space.Absent
   * when no extension can create vaults, hence hide the encryption switch.
   */
  vaultCreation?: VaultCreation
  callbackFn: (
    spaceName: string,
    options: { encrypt: boolean; finalizeVault?: VaultFinalize }
  ) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
}>()

const { $gettext } = useGettext()
const { isSpaceNameValid } = useIsResourceNameValid()

const setupComponent = ref<{ finalize: VaultFinalize }>()
const step = ref<'name' | 'setup'>('name')
const encrypt = ref(false)
const setupValid = ref(false)
const spaceName = ref($gettext('New space'))

const canEncrypt = computed(() => !!vaultCreation)
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
  await callbackFn(unref(spaceName), {
    encrypt: unref(encrypt),
    finalizeVault: unref(setupComponent)?.finalize
  })
}

defineExpose({ onConfirm })
</script>
