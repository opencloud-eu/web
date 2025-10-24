<template>
  <div id="oc-files-file-link" class="relative rounded-sm">
    <div class="flex items-center">
      <h3 class="font-semibold text-base m-0" v-text="$gettext('Public links')" />
      <oc-contextual-helper v-if="helpersEnabled" class="pl-1" v-bind="viaLinkHelp" />
    </div>
    <p v-if="!directLinks.length" class="files-links-empty mt-4" v-text="noLinksLabel" />
    <ul
      v-else
      id="files-links-list"
      class="oc-list oc-list-divider mt-4"
      :aria-label="$gettext('Public links')"
    >
      <li v-for="link in displayLinks" :key="link.id">
        <list-item
          :can-rename="true"
          :is-folder-share="resource.isFolder"
          :is-modifiable="canEditLink"
          :is-password-removable="canDeletePublicLinkPassword(link)"
          :link-share="link"
          @update-link="handleLinkUpdate"
          @remove-public-link="deleteLinkConfirmation"
        />
      </li>
    </ul>
    <div v-if="directLinks.length > 3" class="flex justify-center">
      <oc-button
        class="indirect-link-list-toggle"
        appearance="raw"
        @click="toggleLinkListCollapsed"
      >
        <span v-text="collapseButtonTitle" />
      </oc-button>
    </div>
    <div class="mt-4">
      <oc-button
        v-if="canCreateLinks"
        id="files-file-link-add"
        appearance="raw"
        data-testid="files-link-add-btn"
        @click="addNewLink"
      >
        <span v-text="$gettext('Add link')"
      /></oc-button>
      <p
        v-else
        data-testid="files-links-no-share-permissions-message"
        class="mt-4"
        v-text="$gettext('You do not have permission to create public links.')"
      />
    </div>
    <div v-if="indirectLinks.length" class="mt-4">
      <hr class="my-4" />
      <h4 class="font-semibold text-base m-0">
        {{ indirectLinksHeading }}
        <oc-contextual-helper v-if="helpersEnabled" class="pl-1" v-bind="indirectLinkHelp" />
      </h4>
      <div
        class="grid transition-all duration-250 ease-out"
        :class="{
          '[grid-template-rows:1fr] mt-4': !indirectLinkListCollapsed,
          '[grid-template-rows:0fr]': indirectLinkListCollapsed
        }"
      >
        <ul class="oc-list oc-list-divider overflow-hidden" :aria-label="$gettext('Public links')">
          <li v-for="link in indirectLinks" :key="link.id">
            <list-item
              :is-folder-share="resource.isFolder"
              :is-modifiable="false"
              :link-share="link"
            />
          </li>
        </ul>
      </div>
      <div class="flex justify-center">
        <oc-button
          class="indirect-link-list-toggle"
          appearance="raw"
          @click="toggleIndirectLinkListCollapsed"
        >
          <span v-text="indirectCollapseButtonTitle" />
        </oc-button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, inject, ref, Ref, unref } from 'vue'
import {
  useAbility,
  useFileActionsCreateLink,
  FileAction,
  useClientService,
  useModals,
  useMessages,
  useConfigStore,
  useResourcesStore,
  useLinkTypes,
  useCanShare,
  UpdateLinkOptions,
  useRouter
} from '@opencloud-eu/web-pkg'
import { shareViaLinkHelp, shareViaIndirectLinkHelp } from '../../../helpers/contextualHelpers'
import { isSpaceResource, LinkShare, Resource, SpaceResource } from '@opencloud-eu/web-client'
import ListItem from './Links/ListItem.vue'
import { isLocationSharesActive, useSharesStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { SharingLinkType } from '@opencloud-eu/web-client/graph/generated'

const router = useRouter()
const { showMessage, showErrorMessage } = useMessages()
const { $gettext } = useGettext()
const ability = useAbility()
const clientService = useClientService()
const { can } = ability
const { dispatchModal } = useModals()
const { removeResources } = useResourcesStore()
const { isPasswordEnforcedForLinkType } = useLinkTypes()
const { canShare } = useCanShare()

const canCreateLinks = computed(() => {
  if (!ability.can('create-all', 'PublicLink')) {
    return false
  }
  return canShare({ space: unref(space), resource: unref(resource) })
})

const sharesStore = useSharesStore()
const { updateLink, deleteLink } = sharesStore
const { linkShares } = storeToRefs(sharesStore)

const configStore = useConfigStore()
const { options: configOptions } = storeToRefs(configStore)

const { actions: createLinkActions } = useFileActionsCreateLink()
const createLinkAction = computed<FileAction>(() =>
  unref(createLinkActions).find(({ name }) => name === 'create-links')
)

const space = inject<Ref<SpaceResource>>('space')
const resource = inject<Ref<Resource>>('resource')

const linkListCollapsed = ref(true)
const indirectLinkListCollapsed = ref(true)
const directLinks = computed(() =>
  unref(linkShares)
    .filter((l) => !l.indirect)
    .sort((a, b) => b.createdDateTime.localeCompare(a.createdDateTime))
    .map((share) => {
      return { ...share, key: 'direct-link-' + share.id }
    })
)
const indirectLinks = computed(() =>
  unref(linkShares)
    .filter((l) => l.indirect)
    .sort((a, b) => b.createdDateTime.localeCompare(a.createdDateTime))
    .map((share) => {
      return { ...share, key: 'indirect-link-' + share.id }
    })
)

const canDeleteReadOnlyPublicLinkPassword = computed(() =>
  can('delete-all', 'ReadOnlyPublicLinkPassword')
)

const canEditLink = computed(() => {
  return unref(canCreateLinks) && can('create-all', 'PublicLink')
})

const addNewLink = () => {
  const handlerArgs = { space: unref(space), resources: [unref(resource)] }
  return unref(createLinkAction)?.handler(handlerArgs)
}

const canDeletePublicLinkPassword = (linkShare: LinkShare) => {
  const isPasswordEnforced = isPasswordEnforcedForLinkType(linkShare.type)

  if (!isPasswordEnforced) {
    return true
  }

  return linkShare.type === SharingLinkType.View && unref(canDeleteReadOnlyPublicLinkPassword)
}

const handleLinkUpdate = async ({
  linkShare,
  options
}: {
  linkShare: LinkShare
  options: UpdateLinkOptions['options']
}) => {
  try {
    await updateLink({
      clientService,
      space: unref(space),
      resource: unref(resource),
      linkShare,
      options
    })
    showMessage({ title: $gettext('Link was updated successfully') })
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Failed to update link'),
      errors: [e]
    })
  }
}

const toggleLinkListCollapsed = () => {
  linkListCollapsed.value = !unref(linkListCollapsed)
}

const toggleIndirectLinkListCollapsed = () => {
  indirectLinkListCollapsed.value = !unref(indirectLinkListCollapsed)
}

const noLinksLabel = computed(() => {
  if (isSpaceResource(unref(resource))) {
    return $gettext('This space has no public links.')
  }
  if (unref(resource).isFolder) {
    return $gettext('This folder has no public link.')
  }
  return $gettext('This file has no public link.')
})

const collapseButtonTitle = computed(() => {
  return unref(linkListCollapsed) ? $gettext('Show more') : $gettext('Show less')
})
const indirectCollapseButtonTitle = computed(() => {
  return unref(indirectLinkListCollapsed) ? $gettext('Show') : $gettext('Hide')
})

const helpersEnabled = computed(() => {
  return unref(configOptions).contextHelpers
})

const viaLinkHelp = computed(() => {
  return shareViaLinkHelp({ configStore })
})
const indirectLinkHelp = computed(() => {
  return shareViaIndirectLinkHelp({ configStore })
})
const indirectLinksHeading = computed(() => {
  return $gettext('Indirect (%{ count })', {
    count: unref(indirectLinks).length.toString()
  })
})

const displayLinks = computed(() => {
  if (unref(directLinks).length > 3 && unref(linkListCollapsed)) {
    return unref(directLinks).slice(0, 3)
  }
  return unref(directLinks)
})

const deleteLinkConfirmation = ({ link }: { link: LinkShare }) => {
  dispatchModal({
    title: $gettext('Delete link'),
    message: $gettext(
      'Are you sure you want to delete this link? Recreating the same link again is not possible.'
    ),
    confirmText: $gettext('Delete'),
    onConfirm: async () => {
      let lastLinkId = unref(linkShares).length === 1 ? unref(linkShares)[0].id : undefined

      try {
        await deleteLink({
          clientService,
          space: unref(space),
          resource: unref(resource),
          linkShare: link
        })

        showMessage({ title: $gettext('Link was deleted successfully') })

        if (lastLinkId && isLocationSharesActive(router, 'files-shares-via-link')) {
          if (isSpaceResource(unref(resource))) {
            // spaces need their actual id instead of their share id to be removed from the file list
            lastLinkId = unref(resource).id
          }
          removeResources([{ id: lastLinkId }] as Resource[])
        }
      } catch (e) {
        console.error(e)
        showErrorMessage({
          title: $gettext('Failed to delete link'),
          errors: [e]
        })
      }
    }
  })
}
</script>
