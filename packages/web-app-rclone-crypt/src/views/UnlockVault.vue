<template>
  <div class="oc-vault-unlock flex justify-center h-full overflow-y-auto p-8">
    <no-content-message v-if="!space" img-src="images/vault.svg" class="my-auto">
      <template #message>
        <span v-text="$gettext('Vault not found')" />
      </template>
      <template #callToAction>
        <span v-text="$gettext('Go back and open the vault again from its original location')" />
      </template>
    </no-content-message>
    <oc-card
      v-else
      body-class="px-8 py-4"
      class="rounded-lg bg-role-surface-container w-xl my-auto"
    >
      <oc-tag rounded size="small" color="primary" appearance="filled" class="mb-4">
        <oc-icon name="lock-password" size-class="size-4" fill-type="line" />
        <span v-text="$gettext('End-to-end encrypted')" />
      </oc-tag>
      <div class="flex flex-col items-center text-center">
        <inline-svg src="images/vault.svg" class="h-30 w-30" aria-hidden="true" />
        <p class="mt-0 text-sm break-all" data-testid="vault-name">
          <resource-name
            :name="vaultName"
            extension="vault"
            type="folder"
            :full-path="vaultRoot"
            :is-extension-displayed="resourcesStore.areFileExtensionsShown"
          />
        </p>
        <p class="mb-0 text-lg font-semibold" v-text="cardTitle" />
        <p class="mb-4 text-sm" v-text="vaultDescription" />
      </div>
      <div
        v-if="needsSetup === true"
        class="mb-4 rounded-xl border border-yellow-300 bg-yellow-100 p-4"
        data-testid="vault-setup-hint"
      >
        <div class="flex items-start gap-2">
          <oc-icon
            name="error-warning"
            size-class="size-4"
            fill-type="line"
            class="text-yellow-800"
          />
          <div>
            <p
              class="m-0 mb-2 text-sm font-semibold text-yellow-900"
              v-text="$gettext('Store your passphrase somewhere safe')"
            />
            <p
              class="m-0 text-sm text-yellow-800"
              v-text="
                $gettext(
                  'OpenCloud can’t recover it if you lose it - without it, the vault stays locked permanently.'
                )
              "
            />
          </div>
        </div>
      </div>
      <form @submit.prevent="onSubmit">
        <oc-text-input
          id="vault-passphrase"
          ref="passwordInput"
          v-model="password"
          :error-message="errorMessage"
          :fix-message-line="true"
          :label="passphraseLabel"
          type="password"
          autocomplete="off"
        />
        <oc-text-input
          v-if="needsSetup === true"
          id="vault-passphrase-confirm"
          v-model="confirmPassword"
          :error-message="confirmErrorMessage"
          :label="$gettext('Repeat passphrase')"
          :fix-message-line="true"
          type="password"
          autocomplete="off"
        />
        <div class="flex items-center gap-2 mt-4">
          <oc-button
            id="vault-unlock-cancel"
            class="w-1/3"
            appearance="outline"
            type="button"
            @click="onCancel"
          >
            <span v-text="$gettext('Cancel')" />
          </oc-button>
          <oc-button
            id="vault-unlock-submit"
            appearance="filled"
            submit="submit"
            :disabled="submitDisabled"
            class="flex-1"
          >
            <oc-spinner v-if="verifying" :aria-hidden="true" size="small" />
            <span v-else v-text="submitLabel" />
          </oc-button>
        </div>
      </form>
    </oc-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import InlineSvg from 'vue-inline-svg'
import {
  createLocationShares,
  NoContentMessage,
  queryItemAsString,
  ResourceName,
  useClientService,
  useFolderVaultStore,
  useResourcesStore,
  useRoute,
  useRouter,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { probeVaultNeedsSetup, unlockVault, VaultTarget } from '../unlock'
import { isShareSpaceResource, urlJoin } from '@opencloud-eu/web-client'

InlineSvg.name = 'inline-svg'

const { $gettext } = useGettext()
const route = useRoute()
const router = useRouter()
const clientService = useClientService()
const spacesStore = useSpacesStore()
const vaultStore = useFolderVaultStore()
const resourcesStore = useResourcesStore()

const passwordInput = useTemplateRef<HTMLInputElement>('passwordInput')
const password = ref('')
// Only used while setting up a vault: submitting writes the integrity token,
// which commits the passphrase for good - it can't be changed from within
// OpenCloud - so we make the user type it twice to catch typos first.
const confirmPassword = ref('')
const verifying = ref(false)
const errorMessage = ref<string | null>(null)
// `null` = we haven't probed the server yet, `true` = the vault has no
// passphrase committed yet, so the user is choosing one now, `false` = there's
// an integrity token or content to verify the passphrase against.
const needsSetup = ref<boolean | null>(null)

const spaceId = computed(() => queryItemAsString(unref(route).query.spaceId))
const vaultRoot = computed(() => queryItemAsString(unref(route).query.vaultRoot))
const redirectUrl = computed(() => queryItemAsString(unref(route).query.redirectUrl))

const vaultName = computed(() => {
  const root = unref(vaultRoot) || ''
  // Strip the leading path so only the cleartext folder name (e.g.
  // "myvault.vault") shows up - that's what users recognise. For a root vault
  // "/" (a directly-shared vault) the name lives on the share space instead.
  return root.split('/').filter(Boolean).pop() || unref(space)?.name || root
})

const vaultDescription = computed(() =>
  unref(needsSetup) === true
    ? $gettext(
        'Files are encrypted on your device before they upload, and only your passphrase can unlock them.'
      )
    : $gettext('Enter the passphrase to unlock this vault.')
)

const cardTitle = computed(() =>
  unref(needsSetup) === true ? $gettext('Set Up Encrypted Vault') : $gettext('Unlock vault')
)

const passphraseLabel = computed(() =>
  unref(needsSetup) === true ? $gettext('Choose a passphrase') : $gettext('Vault passphrase')
)

const submitLabel = computed(() =>
  unref(needsSetup) === true ? $gettext('Set passphrase') : $gettext('Unlock')
)

// Surface the mismatch only once the user has started typing the confirmation,
// so the field doesn't show an error before they've had a chance to fill it.
const confirmErrorMessage = computed(() =>
  unref(needsSetup) === true && unref(confirmPassword) && unref(password) !== unref(confirmPassword)
    ? $gettext('Passphrases do not match')
    : null
)

const submitDisabled = computed(() => {
  if (!unref(password) || unref(verifying)) {
    return true
  }
  // Setting up a vault requires both fields to match before we lock it in.
  return unref(needsSetup) === true && unref(password) !== unref(confirmPassword)
})

const space = computed(() => spacesStore.spaces.find((s) => s.id === unref(spaceId)))

const vaultTarget = computed<VaultTarget>(() => ({
  webdav: clientService.webdav,
  space: unref(space),
  vaultRoot: unref(vaultRoot)
}))

async function onSubmit() {
  errorMessage.value = null
  // Guard against a programmatic submit slipping past the disabled button.
  if (unref(needsSetup) === true && unref(password) !== unref(confirmPassword)) {
    errorMessage.value = $gettext('Passphrases do not match.')
    return
  }
  verifying.value = true
  try {
    const result = await unlockVault(unref(vaultTarget), unref(password))
    if (result.status === 'wrong-passphrase') {
      errorMessage.value = $gettext('Incorrect passphrase.')
      return
    }

    vaultStore.setEngine(unref(spaceId), unref(vaultRoot), result.engine)

    const target = unref(redirectUrl)
    // router.push accepts a full URL string and parses path + query for us.
    await router.push(target || urlJoin('/files/spaces', unref(vaultRoot)))
  } catch (e) {
    console.error(e)
    errorMessage.value = $gettext('Unlocking failed. Please try again')
  } finally {
    verifying.value = false
  }
}

onMounted(async () => {
  unref(passwordInput)?.focus?.()
  // Probe once to pick between the "set up" and "unlock" wording. We don't gate
  // the submit button on this - onSubmit re-reads the live state.
  if (!unref(space) || !unref(vaultRoot)) {
    needsSetup.value = false
    return
  }
  try {
    needsSetup.value = await probeVaultNeedsSetup(unref(vaultTarget))
  } catch (e) {
    console.warn('[UnlockVault] could not probe vault contents', e)
    needsSetup.value = false
  }
})

async function onCancel() {
  // Walk one level above the vault root so the user lands back in the folder
  // they came from instead of inside the locked vault - clicking the vault
  // would otherwise just kick them back to this unlock page.
  const root = unref(vaultRoot) || '/'
  // Empty for a vault sitting directly in the space root - urlJoin drops it.
  const parent = root.replace(/\/[^/]+$/, '')
  const targetSpace = unref(space)
  if (isShareSpaceResource(targetSpace) && root === '/') {
    await router.push(createLocationShares('files-shares-with-me'))
    return
  }
  if (targetSpace) {
    await router.push({
      path: urlJoin('/files/spaces', targetSpace.driveAlias, parent),
      ...(isShareSpaceResource(targetSpace) && { query: { shareId: targetSpace.id } })
    })
    return
  }
  await router.push('/files/spaces/personal')
}
</script>

<style scoped>
.oc-vault-unlock :deep(.background-splash) {
  fill: var(--oc-role-surface-container-highest);
}
</style>
