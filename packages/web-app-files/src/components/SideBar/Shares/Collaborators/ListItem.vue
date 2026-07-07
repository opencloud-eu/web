<template>
  <div
    :data-testid="`collaborator-${isAnyUserShareType ? 'user' : 'group'}-item-${
      share.sharedWith.displayName
    }`"
    class="p-2 bg-role-surface-container rounded-xl"
  >
    <div class="w-full grid grid-cols-2 items-center files-collaborators-collaborator-details">
      <div class="flex items-center">
        <div>
          <user-avatar
            v-if="isAnyUserShareType"
            :user-id="share.sharedWith.id"
            :user-name="share.sharedWith.displayName"
            class="files-collaborators-collaborator-indicator"
          />
          <oc-avatar-item
            v-else
            :width="36"
            icon-size="medium"
            :icon="shareTypeIcon"
            :name="shareTypeKey"
            class="files-collaborators-collaborator-indicator"
          />
        </div>
        <div class="files-collaborators-collaborator-name-wrapper pl-2 max-w-full">
          <div class="truncate">
            <span
              aria-hidden="true"
              class="files-collaborators-collaborator-name"
              v-text="shareDisplayName"
            />
            <span class="sr-only" v-text="screenreaderShareDisplayName" />
            <oc-contextual-helper
              v-if="isExternalShare"
              :text="
                $gettext(
                  'External user, registered with another organization’s account but granted access to your resources. External users can only have “view” or “edit” permission.'
                )
              "
              :title="$gettext('External user')"
            />
          </div>
          <div>
            <div v-if="modifiable" class="flex flex-nowrap items-center">
              <role-dropdown
                :dom-selector="shareDomSelector"
                :existing-share-role="share.role"
                :existing-share-permissions="share.permissions"
                :is-locked="isLocked"
                :is-external="isExternalShare"
                class="files-collaborators-collaborator-role max-w-full"
                mode="edit"
                @option-change="shareRoleChanged"
              />
            </div>
            <div v-else-if="share.role">
              <span
                v-oc-tooltip="$gettext(share.role.description)"
                class="mr-1"
                v-text="$gettext(share.role.displayName)"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end">
        <expiration-date-indicator
          v-if="hasExpirationDate"
          class="ml-1 p-1"
          data-testid="recipient-info-expiration-date"
          :expiration-date="DateTime.fromISO(share.expirationDateTime)"
        />
        <oc-icon
          v-if="sharedParentRoute"
          v-oc-tooltip="sharedViaTooltip"
          name="folder-shared"
          fill-type="line"
          class="files-collaborators-collaborator-shared-via ml-1 p-1"
        />
        <edit-dropdown
          class="ml-1"
          data-testid="collaborator-edit"
          :expiration-date="share.expirationDateTime ? share.expirationDateTime : null"
          :share-category="shareCategory"
          :can-edit="modifiable"
          :can-remove="removable"
          :is-locked="isLocked"
          :shared-parent-route="sharedParentRoute"
          :access-details="accessDetails"
          @expiration-date-changed="shareExpirationChanged"
          @remove-share="$emit('onDelete', share)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { DateTime } from 'luxon'

import EditDropdown from './EditDropdown.vue'
import RoleDropdown from './RoleDropdown.vue'
import { CollaboratorShare, ShareRole, ShareTypes } from '@opencloud-eu/web-client'
import {
  queryItemAsString,
  useMessages,
  useSpacesStore,
  useUserStore,
  useSharesStore
} from '@opencloud-eu/web-pkg'
import { Resource, extractDomSelector } from '@opencloud-eu/web-client'
import { computed, inject, Ref, unref } from 'vue'
import { formatDateFromDateTime, useClientService, UserAvatar } from '@opencloud-eu/web-pkg'
import { RouteLocationNamedRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'
import { SpaceResource, isProjectSpaceResource } from '@opencloud-eu/web-client'
import { ContextualHelperDataListItem } from '@opencloud-eu/design-system/helpers'
import ExpirationDateIndicator from '../ExpirationDateIndicator.vue'

const {
  share,
  modifiable = false,
  removable = false,
  sharedParentRoute = null,
  isLocked = false,
  isSpaceShare = false
} = defineProps<{
  share: CollaboratorShare
  modifiable?: boolean
  removable?: boolean
  sharedParentRoute?: RouteLocationNamedRaw
  isLocked?: boolean
  isSpaceShare?: boolean
}>()

defineEmits<{
  (e: 'onDelete', share: CollaboratorShare): void
}>()

const { showMessage, showErrorMessage } = useMessages()
const userStore = useUserStore()
const clientService = useClientService()
const language = useGettext()
const { $gettext } = language

const sharesStore = useSharesStore()
const { updateShare } = sharesStore
const { upsertSpace, loadGraphPermissions } = useSpacesStore()

const { user } = storeToRefs(userStore)

const sharedParentDir = computed(() => {
  return queryItemAsString(sharedParentRoute?.params?.driveAliasAndItem).split('/').pop()
})

const shareDate = computed(() => {
  return formatDateFromDateTime(DateTime.fromISO(share.createdDateTime), language.current)
})

const isExternalShare = computed(() => share.shareType === ShareTypes.remote.value)

const sharedViaTooltip = computed(() =>
  $gettext('Shared via the parent folder "%{sharedParentDir}"', {
    sharedParentDir: unref(sharedParentDir)
  })
)

const resource = inject<Ref<Resource>>('resource')
const space = inject<Ref<SpaceResource>>('space')

const shareType = computed(() => ShareTypes.getByValue(share.shareType))
const shareTypeIcon = computed(() => unref(shareType).icon)
const shareTypeKey = computed(() => unref(shareType).key)
const shareDomSelector = computed(() => {
  if (!share.id) {
    return undefined
  }
  return extractDomSelector(share.id)
})
const isAnyUserShareType = computed(() => ShareTypes.user === unref(shareType))
const shareTypeText = computed(() => $gettext(unref(shareType).label))
const shareCategory = computed(() => (ShareTypes.isIndividual(unref(shareType)) ? 'user' : 'group'))
const shareDisplayName = computed(() => {
  if (user.value.id === share.sharedWith.id) {
    return $gettext('%{collaboratorName} (me)', {
      collaboratorName: share.sharedWith.displayName
    })
  }
  return share.sharedWith.displayName
})
const screenreaderShareDisplayName = computed(() => {
  const context = {
    displayName: share.sharedWith.displayName
  }

  return $gettext('Share receiver name: %{ displayName }', context)
})
const hasExpirationDate = computed(() => !!share.expirationDateTime)
const expirationDate = computed(() => {
  return formatDateFromDateTime(
    DateTime.fromISO(share.expirationDateTime).endOf('day'),
    language.current
  )
})
const shareOwnerDisplayName = computed(() => share.sharedBy.displayName)
const accessDetails = computed<ContextualHelperDataListItem[]>(() => {
  const list: ContextualHelperDataListItem[] = []

  list.push({ text: $gettext('Name'), headline: true }, { text: shareDisplayName.value })

  list.push({ text: $gettext('Type'), headline: true }, { text: shareTypeText.value })
  list.push(
    { text: $gettext('Access expires'), headline: true },
    { text: hasExpirationDate.value ? expirationDate.value : $gettext('no') }
  )
  list.push({ text: $gettext('Shared on'), headline: true }, { text: shareDate.value })

  if (!isSpaceShare) {
    list.push(
      { text: $gettext('Invited by'), headline: true },
      { text: shareOwnerDisplayName.value }
    )
  }

  return list
})

const shareRoleChanged = async (role: ShareRole) => {
  const expirationDateTime = share.expirationDateTime
  try {
    await saveShareChanges({ role, expirationDateTime })
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Failed to apply new permissions'),
      errors: [e]
    })
  }
}

const shareExpirationChanged = async ({ expirationDateTime }: { expirationDateTime: DateTime }) => {
  const role = share.role
  try {
    await saveShareChanges({ role, expirationDateTime: expirationDateTime?.toISO() ?? null })
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Failed to apply expiration date'),
      errors: [e]
    })
  }
}

const saveShareChanges = async ({
  role,
  expirationDateTime
}: {
  role: ShareRole
  expirationDateTime?: string | null
}) => {
  try {
    await updateShare({
      clientService,
      space: unref(space),
      resource: unref(resource),
      collaboratorShare: share,
      options: { roles: [role.id], expirationDateTime }
    })

    const item = unref(resource)
    if (isProjectSpaceResource(item)) {
      const client = clientService.graphAuthenticated
      const space = await client.drives.getDrive(item.id)
      upsertSpace({ ...space, graphPermissions: item.graphPermissions })

      if (share.sharedWith.id === user.value.id) {
        // re-fetch current user permissions because they might have changed
        await loadGraphPermissions({
          ids: [item.id],
          graphClient: clientService.graphAuthenticated,
          useCache: false
        })
      }
    }

    showMessage({ title: $gettext('Share successfully changed') })
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Error while editing the share.'),
      errors: [e]
    })
  }
}
</script>
