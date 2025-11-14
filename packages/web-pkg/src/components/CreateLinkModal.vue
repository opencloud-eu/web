<template>
  <div class="flex justify-between pb-2">
    <div v-if="isAdvancedMode" class="flex items-center">
      <oc-icon class="mr-2" :name="selectedTypeIcon" fill-type="line" />
      <link-role-dropdown
        :model-value="selectedType"
        :available-link-type-options="availableLinkTypes"
        @update:model-value="updateSelectedLinkType"
      />
    </div>
    <div v-else class="flex items-center">
      <oc-icon class="mr-2" :name="selectedTypeIcon" fill-type="line" />
      <div class="flex flex-col">
        <span class="font-semibold" v-text="selectedTypeDisplayName" />
        <span class="text-sm" v-text="selectedTypeDescription" />
      </div>
    </div>
    <oc-button
      v-if="!isAdvancedMode"
      class="link-modal-advanced-mode-button"
      gap-size="xsmall"
      appearance="raw"
      no-hover
      @click="setAdvancedMode()"
    >
      <oc-icon name="settings-3" size="small" fill-type="fill" />
      <span v-text="$gettext('Options')" />
    </oc-button>
  </div>
  <div class="mb-4 ml-[30px]">
    <oc-text-input
      v-if="isAdvancedMode"
      :key="passwordInputKey"
      :model-value="password.value"
      type="password"
      :password-policy="passwordPolicy"
      :generate-password-method="generatePasswordMethod"
      :error-message="password.error"
      :label="$gettext('Password')"
      :required-mark="passwordEnforced"
      class="link-modal-password-input"
      @update:model-value="updatePassword"
    />
    <div v-else-if="password.value" class="text-sm text-role-on-surface-variant">
      <span v-text="$gettext('Password:')" />
      <span v-text="password.value" />
    </div>
    <oc-datepicker
      v-if="isAdvancedMode"
      class="mt-2"
      :min-date="DateTime.now()"
      :label="$gettext('Expiry date')"
      :is-dark="currentTheme.isDark"
      @date-changed="onExpiryDateChanged"
    />
  </div>
  <div class="flex justify-end items-center mt-2">
    <oc-button class="link-modal-cancel oc-modal-body-actions-cancel ml-2" @click="$emit('cancel')">
      {{ $gettext('Cancel') }}
    </oc-button>
    <div class="ml-2" :class="{ 'oc-button-group': password.value }">
      <oc-button
        class="link-modal-confirm oc-modal-body-actions-confirm"
        appearance="filled"
        :disabled="confirmButtonDisabled"
        @click="$emit('confirm')"
      >
        {{ confirmButtonText }}
      </oc-button>
      <oc-button
        v-if="password.value"
        class="link-modal-confirm oc-modal-body-actions-confirm-secondary-trigger p-1"
        appearance="filled"
        :disabled="confirmButtonDisabled"
        :aria-label="$gettext('More options')"
      >
        <oc-icon size="small" name="arrow-down-s" />
        <span class="sr-only">{{ $gettext('More options') }}</span>
      </oc-button>
      <oc-drop
        v-if="password.value"
        drop-id="oc-modal-body-actions-confirm-secondary-drop"
        toggle=".oc-modal-body-actions-confirm-secondary-trigger"
        mode="click"
        padding-size="small"
        :title="$gettext('More options')"
        close-on-click
      >
        <oc-list>
          <li>
            <oc-button
              class="oc-modal-body-actions-confirm-password"
              appearance="raw"
              justify-content="left"
              @click="$emit('confirm', { copyPassword: true })"
            >
              {{ confirmPasswordButtonText }}
            </oc-button>
          </li>
        </oc-list>
      </oc-drop>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { v4 as uuidV4 } from 'uuid'
import { upperFirst } from 'lodash-es'
import { useGettext } from 'vue3-gettext'
import { ComponentPublicInstance, computed, ref, reactive, unref, onMounted } from 'vue'
import {
  usePasswordPolicyService,
  useEmbedMode,
  useLinkTypes,
  Modal,
  useSharesStore,
  useClientService,
  useThemeStore,
  useModals,
  useCopyLink
} from '../composables'
import { LinkShare, SpaceResource } from '@opencloud-eu/web-client'
import { Resource } from '@opencloud-eu/web-client'
import { OcButton } from '@opencloud-eu/design-system/components'
import { SharingLinkType } from '@opencloud-eu/web-client/graph/generated'
import LinkRoleDropdown from './LinkRoleDropdown.vue'
import { storeToRefs } from 'pinia'

type RoleRef = ComponentPublicInstance<typeof OcButton>

const {
  modal,
  resources,
  space = undefined
} = defineProps<{
  modal: Modal
  resources: Resource[]
  space?: SpaceResource
}>()

defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm', options?: { copyPassword?: boolean }): void
}>()

const clientService = useClientService()
const language = useGettext()
const { $gettext } = language
const { removeModal } = useModals()
const { copyLink } = useCopyLink()
const passwordPolicyService = usePasswordPolicyService()
const { isEnabled: isEmbedEnabled, postMessage } = useEmbedMode()
const { defaultLinkType, getAvailableLinkTypes, getLinkRoleByType, isPasswordEnforcedForLinkType } =
  useLinkTypes()
const { addLink } = useSharesStore()
const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)

const isAdvancedMode = ref(false)
const isInvalidExpiryDate = ref(false)

const isFolder = computed(() => resources.every(({ isFolder }) => isFolder))

const confirmButtonText = computed(() => {
  if (unref(isEmbedEnabled)) {
    return $gettext('Share link(s)')
  }

  return $gettext('Copy link')
})

const confirmPasswordButtonText = computed(() => {
  if (unref(isEmbedEnabled)) {
    return $gettext('Share link(s) and password(s)')
  }

  return $gettext('Copy link and password')
})

const passwordInputKey = ref(uuidV4())
const roleRefs = ref<Record<string, RoleRef>>({})

const selectedExpiry = ref<DateTime>()
const password = reactive({ value: '', error: undefined })
const selectedType = ref(unref(defaultLinkType))

const selectedTypeDescription = computed(() =>
  $gettext(getLinkRoleByType(unref(selectedType)).description)
)

const selectedTypeDisplayName = computed(() =>
  $gettext(getLinkRoleByType(unref(selectedType)).displayName)
)

const selectedTypeIcon = computed(() => getLinkRoleByType(unref(selectedType)).icon)

const availableLinkTypes = computed(() => getAvailableLinkTypes({ isFolder: unref(isFolder) }))
const passwordEnforced = computed(() => isPasswordEnforcedForLinkType(unref(selectedType)))

const passwordPolicy = passwordPolicyService.getPolicy({
  enforcePassword: unref(passwordEnforced)
})

const setAdvancedMode = () => {
  isAdvancedMode.value = true
}

const onExpiryDateChanged = ({ date, error }: { date: DateTime; error: boolean }) => {
  selectedExpiry.value = date
  isInvalidExpiryDate.value = error
}

const createLinks = () => {
  return Promise.allSettled<LinkShare>(
    resources.map((resource) =>
      addLink({
        clientService,
        space: space,
        resource,
        options: {
          type: unref(selectedType),
          '@libre.graph.quickLink': false,
          password: unref(password).value,
          expirationDateTime: unref(selectedExpiry)?.toISO(),
          displayName: $gettext('Unnamed link')
        }
      })
    )
  )
}

const passwordPolicyFulfilled = computed(() => {
  return passwordPolicy.check(unref(password).value)
})

const confirmButtonDisabled = computed(() => {
  return !unref(passwordPolicyFulfilled) || unref(isInvalidExpiryDate)
})

const createLinkHandler = async () => {
  const result = await createLinks()

  const userFacingErrors: Error[] = []
  const failed = result.filter(({ status }) => status === 'rejected')
  if (failed.length) {
    ;(failed as PromiseRejectedResult[])
      .map(({ reason }) => reason)
      .forEach((e) => {
        console.error(e)
        // Human-readable error message is provided, for example when password is on banned list
        if (e.response?.status === 400) {
          const error = e.response.data.error
          error.message = upperFirst(error.message)
          userFacingErrors.push(error)
        }
      })
  }

  if (userFacingErrors.length) {
    password.error = $gettext(userFacingErrors[0].message)
    return Promise.reject()
  }

  return result
}

const onConfirm = async (options: { copyPassword?: boolean } = {}) => {
  if (unref(isEmbedEnabled)) {
    const result = await createLinkHandler()
    const succeeded = result.filter(({ status }) => status === 'fulfilled')
    if (succeeded.length) {
      /** @deprecated Always emit the share url for backwards compatibility */
      postMessage<string[]>(
        'opencloud-embed:share',
        (succeeded as PromiseFulfilledResult<LinkShare>[]).map(({ value }) => value.webUrl)
      )

      // Always emit new event with objects, include password only when copyPassword is enabled
      postMessage<Array<{ url: string; password?: string }>>(
        'owncloud-embed:share-links',
        (succeeded as PromiseFulfilledResult<LinkShare>[]).map(({ value }) => ({
          url: value.webUrl,
          ...(options.copyPassword && { password: unref(password).value })
        }))
      )
    }
    removeModal(modal.id)
    return
  }

  await copyLink({
    createLinkHandler,
    password: options.copyPassword ? unref(password).value : undefined
  })
  removeModal(modal.id)
}

defineExpose({ onConfirm })

const updatePassword = (value: string) => {
  password.value = value
  password.error = undefined
}

const updateSelectedLinkType = (type: SharingLinkType) => {
  selectedType.value = type
}

const generatePasswordMethod = () => passwordPolicyService.generatePassword()

onMounted(() => {
  const activeRoleOption = unref(roleRefs)[unref(selectedType)]
  if (activeRoleOption) {
    activeRoleOption.$el.focus()
  }

  if (unref(passwordEnforced)) {
    password.value = passwordPolicyService.generatePassword()
  }
})
</script>
