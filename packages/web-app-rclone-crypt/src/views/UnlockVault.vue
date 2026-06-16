<template>
  <div class="oc-vault-unlock h-screen flex flex-col justify-center items-center p-4">
    <oc-card
      :title="cardTitle"
      body-class="text-center"
      header-class="text-center"
      class="w-auto md:w-lg rounded-lg"
    >
      <div class="mb-4 flex flex-col items-center gap-2">
        <oc-icon name="folder-lock" fill-type="line" size="xlarge" />
        <p
          class="m-0 text-xl font-semibold break-all"
          data-testid="vault-name"
          v-text="vaultName"
        />
      </div>
      <p class="mb-2" v-text="vaultDescription" />
      <p
        v-if="isEmpty === true"
        class="mb-3 text-sm opacity-80"
        data-testid="empty-vault-hint"
        v-text="
          $gettext(
            'This vault is still empty, so there is no right or wrong passphrase yet. The passphrase you enter here will be locked in when the first file gets uploaded and cannot be changed from within OpenCloud afterwards.'
          )
        "
      />
      <form @submit.prevent="onSubmit">
        <oc-text-input
          id="vault-passphrase"
          ref="passwordInput"
          v-model="password"
          :error-message="errorMessage"
          :label="passphraseLabel"
          type="password"
          autocomplete="off"
          class="mb-3 [&_.oc-text-input-message]:justify-center"
        />
        <oc-text-input
          v-if="isEmpty === true"
          id="vault-passphrase-confirm"
          v-model="confirmPassword"
          :error-message="confirmErrorMessage"
          :label="$gettext('Repeat passphrase')"
          type="password"
          autocomplete="off"
          class="mb-3 [&_.oc-text-input-message]:justify-center"
        />
        <div class="flex justify-center gap-2">
          <oc-button id="vault-unlock-cancel" appearance="outline" type="button" @click="onCancel">
            <span v-text="$gettext('Cancel')" />
          </oc-button>
          <oc-button
            id="vault-unlock-submit"
            appearance="filled"
            submit="submit"
            :disabled="submitDisabled"
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
import {
  createLocationShares,
  queryItemAsString,
  useClientService,
  useFolderVaultStore,
  useRoute,
  useRouter,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { createEngine } from '../crypto/engine'
import { isShareSpaceResource } from '@opencloud-eu/web-client'

const { $gettext } = useGettext()
const route = useRoute()
const router = useRouter()
const clientService = useClientService()
const spacesStore = useSpacesStore()
const vaultStore = useFolderVaultStore()

const passwordInput = useTemplateRef<HTMLInputElement>('passwordInput')
const password = ref('')
// Only used while setting up a still-empty vault: the passphrase is committed by
// the first upload and can't be changed from within OpenCloud, so we make the
// user type it twice to catch typos before it's locked in for good.
const confirmPassword = ref('')
const verifying = ref(false)
const errorMessage = ref<string | null>(null)
// `null` = we haven't probed the server yet, `true` = the vault has no
// encrypted entries we could verify the passphrase against (any passphrase
// is accepted and effectively committed by the first upload), `false` =
// there's content to verify against.
const isEmpty = ref<boolean | null>(null)

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
  unref(isEmpty) === true
    ? $gettext('No content has been uploaded yet.')
    : $gettext('Enter the passphrase to unlock this vault.')
)

const cardTitle = computed(() =>
  unref(isEmpty) === true ? $gettext('Set up vault') : $gettext('Unlock vault')
)

const passphraseLabel = computed(() =>
  unref(isEmpty) === true ? $gettext('Choose a passphrase') : $gettext('Vault passphrase')
)

const submitLabel = computed(() =>
  unref(isEmpty) === true ? $gettext('Set passphrase') : $gettext('Unlock')
)

// Surface the mismatch only once the user has started typing the confirmation,
// so the field doesn't show an error before they've had a chance to fill it.
const confirmErrorMessage = computed(() =>
  unref(isEmpty) === true && unref(confirmPassword) && unref(password) !== unref(confirmPassword)
    ? $gettext('Passphrases do not match.')
    : null
)

const submitDisabled = computed(() => {
  if (!unref(password) || unref(verifying)) {
    return true
  }
  // Setting up a vault requires both fields to match before we lock it in.
  return unref(isEmpty) === true && unref(password) !== unref(confirmPassword)
})

const space = computed(() => spacesStore.spaces.find((s) => s.id === unref(spaceId)))

const onSubmit = async () => {
  errorMessage.value = null
  // Guard against a programmatic submit slipping past the disabled button.
  if (unref(isEmpty) === true && unref(password) !== unref(confirmPassword)) {
    errorMessage.value = $gettext('Passphrases do not match.')
    return
  }
  verifying.value = true
  try {
    // 1. Fetch the vault root listing to grab a sample encrypted name we can
    //    verify the key against. Doesn't decrypt anything - names stay raw.
    //    rclone-crypt's filename encryption is deterministic; one valid
    //    decrypt is a strong signal that the key fits.
    if (!unref(space)) {
      errorMessage.value = $gettext('Could not find the target space.')
      return
    }
    const { children } = await clientService.webdav.listFiles(unref(space), {
      path: unref(vaultRoot)
    })
    const sample = (children ?? []).find((c) => c?.name)?.name

    // Build the engine with the supplied passphrase and ask it to decrypt our
    // sample. Empty vault → trust the passphrase (nothing to disagree with).
    // Otherwise success here means "this is the right key". The very same engine
    // is what we stash, so it doubles as the session's unlocked engine.
    const engine = createEngine(unref(vaultRoot), unref(password))
    const keyOk = sample ? await engine.verifyKey(sample) : true
    if (!keyOk) {
      errorMessage.value = $gettext('Incorrect passphrase.')
      return
    }

    vaultStore.setEngine(unref(spaceId), unref(vaultRoot), engine)

    const target = unref(redirectUrl)
    // router.push accepts a full URL string and parses path + query for us.
    await router.push(target || `/files/spaces${unref(vaultRoot)}`)
  } catch (e) {
    console.error(e)
    errorMessage.value = $gettext('Unlocking failed. Please try again.')
  } finally {
    verifying.value = false
  }
}

onMounted(async () => {
  unref(passwordInput)?.focus?.()
  // Probe the vault root listing once to decide if we should switch to
  // "empty vault, any passphrase wins" wording. We don't gate the submit
  // button on this - onSubmit re-checks against the live listing.
  try {
    const targetSpace = unref(space)
    const root = unref(vaultRoot)
    if (!targetSpace || !root) {
      isEmpty.value = false
      return
    }
    const { children } = await clientService.webdav.listFiles(targetSpace, { path: root })
    isEmpty.value = (children ?? []).length === 0
  } catch (e) {
    console.warn('[UnlockVault] could not probe vault contents', e)
    isEmpty.value = false
  }
})

const onCancel = async () => {
  // Walk one level above the vault root so the user lands back in the folder
  // they came from instead of inside the locked vault - clicking the vault
  // would otherwise just kick them back to this unlock page.
  const root = unref(vaultRoot) || '/'
  const parent = root.replace(/\/[^/]+$/, '') || '/'
  const space = unref(spacesStore.spaces).find((s) => s.id === unref(spaceId))
  if (isShareSpaceResource(space) && root === '/') {
    await router.push(createLocationShares('files-shares-with-me'))
    return
  }
  if (space) {
    await router.push({
      path: `/files/spaces/${space.driveAlias}${parent === '/' ? '' : parent}`,
      ...(isShareSpaceResource(space) && { query: { shareId: space.id } })
    })
    return
  }
  await router.push('/files/spaces/personal')
}
</script>
