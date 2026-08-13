<template>
  <div class="flex justify-center h-full overflow-y-auto p-8">
    <div v-if="areSpacesLoading" class="my-auto flex justify-center">
      <oc-spinner size="large" :aria-label="$gettext('Loading vault')" />
    </div>
    <no-content-message v-else-if="!space" img-src="images/vault.svg" class="my-auto">
      <template #message>
        <span v-text="$gettext('Vault not found')" />
      </template>
      <template #callToAction>
        <span v-text="$gettext('Go back and open the vault again from its original location')" />
      </template>
    </no-content-message>
    <oc-card
      v-else
      body-class="p-8"
      class="rounded-xl bg-role-surface-container w-xl my-auto border"
    >
      <h2 v-if="needsSetup !== null" class="mt-0 mb-6 text-xl font-semibold" v-text="cardTitle" />
      <div v-if="needsSetup === null" class="flex justify-center py-8">
        <oc-spinner size="large" :aria-label="$gettext('Loading vault')" />
      </div>
      <form v-else @submit.prevent="onSubmit">
        <vault-setup
          v-if="needsSetup"
          v-model="password"
          :vault-name="vaultName"
          :error-message="errorMessage"
          :is-space="isSpaceVault"
        />
        <template v-else>
          <div class="flex items-start gap-3">
            <resource-icon
              :resource="iconResource"
              size-class="size-8"
              class="rounded-sm shrink-0"
            />
            <div class="min-w-0">
              <p class="mt-0 mb-1 font-semibold break-all" data-testid="vault-name">
                <resource-name
                  :name="vaultName"
                  :extension="isSpaceVault ? '' : 'vault'"
                  :type="isSpaceVault ? 'space' : 'folder'"
                  :full-path="vaultRoot"
                  :is-extension-displayed="resourcesStore.areFileExtensionsShown"
                />
              </p>
              <p class="m-0 text-sm" v-text="unlockHint" />
            </div>
          </div>
          <oc-text-input
            id="vault-passphrase"
            ref="passwordInput"
            v-model="password"
            class="mt-4"
            :error-message="errorMessage"
            :error-message-debounced-time="0"
            :fix-message-line="true"
            :label="$gettext('Password')"
            required-mark
            type="password"
            autocomplete="off"
          />
        </template>
        <div class="flex items-center justify-end gap-2 mt-4">
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
import { computed, nextTick, onMounted, ref, unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  createLocationShares,
  NoContentMessage,
  queryItemAsString,
  ResourceIcon,
  ResourceName,
  useClientService,
  useVaultStore,
  useResourcesStore,
  useRoute,
  useRouter,
  useSpacesLoading,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { probeVaultNeedsSetup, unlockVault } from '../unlock'
import { VaultTarget } from '../integrity'
import { isShareSpaceResource, Resource, urlJoin } from '@opencloud-eu/web-client'
import VaultSetup from '../components/VaultSetup.vue'
import { isVaultDrive, VAULT_EXTENSION } from '../vaultLocation'

const { $gettext } = useGettext()
const route = useRoute()
const router = useRouter()
const clientService = useClientService()
const spacesStore = useSpacesStore()
const { areSpacesLoading, waitForSpaces } = useSpacesLoading()
const vaultStore = useVaultStore()
const resourcesStore = useResourcesStore()

const passwordInput = useTemplateRef<{ focus: () => void }>('passwordInput')
const password = ref('')
const verifying = ref(false)
const errorMessage = ref<string | null>(null)
// `null` = we haven't probed the server yet, `true` = the vault has no
// passphrase committed yet, so the user is choosing one now, `false` = there's
// an integrity token or content to verify the passphrase against.
const needsSetup = ref<boolean | null>(null)

const spaceId = computed(() => queryItemAsString(unref(route).query.spaceId))
const vaultRoot = computed(() => queryItemAsString(unref(route).query.vaultRoot))
const redirectUrl = computed(() => queryItemAsString(unref(route).query.redirectUrl))
const cancelUrl = computed(() => queryItemAsString(unref(route).query.cancelUrl))

const vaultName = computed(() => {
  const root = unref(vaultRoot) || ''
  // Strip the leading path so only the cleartext folder name (e.g.
  // "myvault.vault") shows up - that's what users recognise. For a root vault
  // "/" (a directly-shared vault) the name lives on the share space instead.
  return root.split('/').filter(Boolean).pop() || unref(space)?.name || root
})

const isSpaceVault = computed(() => isVaultDrive(unref(space)))

const iconResource = computed<Resource>(() =>
  unref(isSpaceVault)
    ? unref(space)
    : ({ type: 'folder', isFolder: true, extension: VAULT_EXTENSION } as Resource)
)

const cardTitle = computed(() => {
  if (unref(needsSetup) === true) {
    return unref(isSpaceVault)
      ? $gettext('Set up encrypted space')
      : $gettext('Set up encrypted folder')
  }
  return unref(isSpaceVault) ? $gettext('Unlock space') : $gettext('Unlock folder')
})

const unlockHint = computed(() =>
  unref(isSpaceVault)
    ? $gettext(
        'This space is end-to-end encrypted. Enter its password to decrypt the files on this device.'
      )
    : $gettext(
        'This folder is end-to-end encrypted. Enter its password to decrypt the files on this device.'
      )
)

const submitLabel = computed(() =>
  unref(needsSetup) === true ? $gettext('Set password') : $gettext('Unlock')
)

const submitDisabled = computed(() => !unref(password) || unref(verifying))

const space = computed(() => spacesStore.spaces.find((s) => s.id === unref(spaceId)))

const vaultTarget = computed<VaultTarget>(() => ({
  webdav: clientService.webdav,
  space: unref(space),
  vaultRoot: unref(vaultRoot)
}))

async function onSubmit() {
  errorMessage.value = null
  verifying.value = true
  try {
    const result = await unlockVault(unref(vaultTarget), unref(password))
    if (result.status === 'wrong-passphrase') {
      errorMessage.value = $gettext('Incorrect password.')
      return
    }

    vaultStore.setEngine(unref(spaceId), unref(vaultRoot), result.engine)

    const target = unref(redirectUrl)
    // router.push accepts a full URL string and parses path + query for us.
    // Without a redirect the vault root is the destination - which for a vault
    // space is the space itself, addressed by its drive alias.
    const fallback = unref(isSpaceVault)
      ? urlJoin('/files/spaces', unref(space).driveAlias)
      : urlJoin('/files/spaces', unref(vaultRoot))
    await router.push(target || fallback)
  } catch (e) {
    console.error(e)
    errorMessage.value = $gettext('Unlocking failed. Please try again')
  } finally {
    verifying.value = false
  }
}

onMounted(async () => {
  await waitForSpaces()

  // Probe once to pick between the "set up" and the "unlock" UI. We don't gate
  // the submit button on this - onSubmit re-reads the live state.
  if (!unref(space) || !unref(vaultRoot)) {
    needsSetup.value = false
  } else {
    try {
      needsSetup.value = await probeVaultNeedsSetup(unref(vaultTarget))
    } catch (e) {
      console.warn('[UnlockVault] could not probe vault contents', e)
      needsSetup.value = false
    }
  }

  // The setup step focuses its own field, so only the unlock branch is ours.
  if (unref(needsSetup) === false) {
    await nextTick()
    unref(passwordInput)?.focus?.()
  }
})

async function onCancel() {
  // Whoever sent the user here knows where they set off from. Missing on a
  // cold start, then the fallbacks below apply.
  if (unref(cancelUrl)) {
    await router.push(unref(cancelUrl))
    return
  }
  // Walk one level above the vault root so the user lands next to the vault
  // instead of inside the locked one.
  const root = unref(vaultRoot) || '/'
  // Empty for a vault sitting directly in the space root - urlJoin drops it.
  const parent = root.replace(/\/[^/]+$/, '')
  const targetSpace = unref(space)
  if (isShareSpaceResource(targetSpace) && root === '/') {
    await router.push(createLocationShares('files-shares-with-me'))
    return
  }
  if (unref(isSpaceVault)) {
    await router.push({ name: 'files-spaces-projects' })
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
