<template>
  <div class="w-full flex items-center justify-between">
    <div class="flex items-center">
      <oc-avatar-item :width="36" icon-size="medium" icon="link" name="link" />
      <div class="grid pl-2">
        <span class="files-links-name truncate" v-text="linkShare.displayName" />
        <div class="flex flex-nowrap items-center">
          <link-role-dropdown
            v-if="isModifiable"
            :model-value="currentLinkType"
            :available-link-type-options="availableLinkTypeOptions"
            @update:model-value="updateSelectedType"
          />
          <span
            v-else
            v-oc-tooltip="$gettext(currentLinkRoleDescription)"
            class="link-current-role"
            v-text="$gettext(currentLinkRoleLabel)"
          />
        </div>
      </div>
    </div>
    <div class="flex items-center">
      <div class="flex">
        <oc-icon
          v-if="linkShare.hasPassword"
          v-oc-tooltip="$gettext('This link is password-protected')"
          name="lock-password"
          class="oc-files-file-link-has-password ml-1 p-1"
          fill-type="line"
          :aria-label="$gettext('This link is password-protected')"
        />
      </div>
      <expiration-date-indicator
        v-if="linkShare.expirationDateTime"
        :expiration-date="DateTime.fromISO(linkShare.expirationDateTime)"
        class="ml-1"
      />
      <copy-link :link-share="linkShare" class="ml-1" />
      <edit-dropdown
        :can-rename="canRename"
        :is-modifiable="isModifiable"
        :is-password-removable="isPasswordRemovable"
        :link-share="linkShare"
        class="ml-1"
        @remove-public-link="$emit('removePublicLink', $event)"
        @update-link="$emit('updateLink', $event)"
        @show-password-modal="showPasswordModal"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { LinkRoleDropdown, useAbility, useLinkTypes, useModals } from '@opencloud-eu/web-pkg'
import { LinkShare, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { computed, inject, Ref, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import SetLinkPasswordModal from '../../../Modals/SetLinkPasswordModal.vue'
import { SharingLinkType } from '@opencloud-eu/web-client/graph/generated'
import ExpirationDateIndicator from '../ExpirationDateIndicator.vue'
import CopyLink from './CopyLink.vue'
import EditDropdown from './EditDropdown.vue'

const {
  linkShare,
  canRename = false,
  isFolderShare = false,
  isModifiable = false,
  isPasswordRemovable = false
} = defineProps<{
  linkShare: LinkShare
  canRename?: boolean
  isFolderShare?: boolean
  isModifiable?: boolean
  isPasswordRemovable?: boolean
}>()

const emit = defineEmits<{
  (e: 'removePublicLink', linkShare: { link: LinkShare }): void
  (e: 'updateLink', payload: { linkShare: LinkShare; options: { type: SharingLinkType } }): void
}>()

const { dispatchModal } = useModals()
const { $gettext } = useGettext()
const { can } = useAbility()
const { getAvailableLinkTypes, getLinkRoleByType, isPasswordEnforcedForLinkType } = useLinkTypes()

const space = inject<Ref<SpaceResource>>('space')
const resource = inject<Ref<Resource>>('resource')

const currentLinkType = ref<SharingLinkType>(linkShare.type)

const canDeleteReadOnlyPublicLinkPassword = computed(() =>
  can('delete-all', 'ReadOnlyPublicLinkPassword')
)

const updateSelectedType = (type: SharingLinkType) => {
  currentLinkType.value = type
  const needsNoPw = unref(canDeleteReadOnlyPublicLinkPassword) && type === SharingLinkType.View

  if (!linkShare.hasPassword && !needsNoPw && isPasswordEnforcedForLinkType(type)) {
    showPasswordModal(() => emit('updateLink', { linkShare: { ...linkShare }, options: { type } }))
    return
  }

  emit('updateLink', { linkShare, options: { type } })
}

const showPasswordModal = (callbackFn: () => void = undefined) => {
  dispatchModal({
    title: linkShare.hasPassword ? $gettext('Edit password') : $gettext('Add password'),
    customComponent: SetLinkPasswordModal,
    customComponentAttrs: () => ({
      space: unref(space),
      resource: unref(resource),
      link: linkShare,
      ...(callbackFn && { callbackFn })
    })
  })
}

const availableLinkTypeOptions = computed(() => getAvailableLinkTypes({ isFolder: isFolderShare }))

const currentLinkRoleDescription = computed(() => {
  return getLinkRoleByType(unref(currentLinkType))?.description || ''
})

const currentLinkRoleLabel = computed(() => {
  return getLinkRoleByType(unref(currentLinkType))?.displayName || ''
})
</script>
