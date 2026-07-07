<template>
  <div id="oc-files-sharing-sidebar" class="relative">
    <invite-collaborator-form
      v-if="canShare({ resource, space })"
      key="new-collaborator"
      :label="$gettext('Share with people')"
      :contextual-helper="{
        isEnabled: helpersEnabled,
        data: inviteCollaboratorHelp
      }"
      :resource="resource"
      class="mt-2"
    />
    <p v-else key="no-share-permissions-message" v-text="noSharePermsMessage" />
    <template v-if="hasSharees">
      <div id="files-collaborators-headline" class="flex items-center justify-between">
        <h4 class="font-semibold my-0" v-text="sharedWithLabel" />
      </div>
      <custom-component-target
        :extension-point="fileSideBarSharesPanelSharedWithTopExtensionPoint"
      />
      <ul
        id="files-collaborators-list"
        class="oc-list"
        :class="{ 'mb-4': showSpaceMembers, 'mb-2': !showSpaceMembers }"
        :aria-label="$gettext('Share receivers')"
      >
        <li v-for="collaborator in displayCollaborators" :key="collaborator.id">
          <collaborator-list-item
            :share="collaborator"
            :modifiable="isShareModifiable(collaborator)"
            :removable="isShareRemovable(collaborator)"
            :shared-parent-route="getSharedParentRoute(collaborator)"
            :is-locked="resource.locked"
            @on-delete="deleteShareConfirmation"
          />
        </li>
        <custom-component-target
          :extension-point="fileSideBarSharesPanelSharedWithBottomExtensionPoint"
        />
      </ul>
      <div v-if="showShareToggle" class="flex justify-center">
        <oc-button
          appearance="raw"
          class="toggle-shares-list-btn"
          @click="toggleShareListCollapsed"
        >
          {{ collapseButtonTitle }}
        </oc-button>
      </div>
    </template>
    <template v-if="showSpaceMembers">
      <div class="flex items-center justify-between mt-2">
        <h4 class="font-semibold my-2" v-text="spaceMemberLabel" />
      </div>
      <ul
        id="space-collaborators-list"
        class="oc-list oc-list-divider overflow-hidden m-0"
        :aria-label="spaceMemberLabel"
      >
        <li v-for="(collaborator, i) in displaySpaceMembers" :key="i">
          <collaborator-list-item
            :share="collaborator"
            :modifiable="false"
            :is-space-share="true"
          />
        </li>
      </ul>
      <div v-if="showMemberToggle" class="flex justify-center">
        <oc-button appearance="raw" @click="toggleMemberListCollapsed">
          {{ collapseMemberButtonTitle }}
        </oc-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  useGetMatchingSpace,
  useModals,
  useUserStore,
  useMessages,
  useSpacesStore,
  useConfigStore,
  useSharesStore,
  useResourcesStore,
  useCanShare,
  CustomComponentTarget,
  useClientService,
  useRouter
} from '@opencloud-eu/web-pkg'
import { isLocationSharesActive } from '@opencloud-eu/web-pkg'
import { textUtils } from '../../../helpers/textUtils'
import { isShareSpaceResource, ShareTypes } from '@opencloud-eu/web-client'
import InviteCollaboratorForm from './Collaborators/InviteCollaborator/InviteCollaboratorForm.vue'
import CollaboratorListItem from './Collaborators/ListItem.vue'
import { useContextualHelpers } from '../../../composables/contextualHelpers'
import { computed, inject, ref, Ref, unref } from 'vue'
import {
  isProjectSpaceResource,
  Resource,
  SpaceResource,
  CollaboratorShare
} from '@opencloud-eu/web-client'
import { getSharedAncestorRoute } from '@opencloud-eu/web-pkg'
import {
  fileSideBarSharesPanelSharedWithTopExtensionPoint,
  fileSideBarSharesPanelSharedWithBottomExtensionPoint
} from '../../../extensionPoints'
import { useGettext } from 'vue3-gettext'

const { $gettext } = useGettext()
const clientService = useClientService()
const userStore = useUserStore()
const { getMatchingSpace } = useGetMatchingSpace()
const { dispatchModal } = useModals()
const { canShare } = useCanShare()
const router = useRouter()
const { showMessage, showErrorMessage } = useMessages()
const { shareInviteCollaboratorHelp } = useContextualHelpers()

const resourcesStore = useResourcesStore()
const { removeResources, getAncestorById } = resourcesStore

const { getSpaceMembers } = useSpacesStore()

const configStore = useConfigStore()
const { options: configOptions } = storeToRefs(configStore)

const sharesStore = useSharesStore()
const { deleteShare } = sharesStore

const { user } = storeToRefs(userStore)

const resource = inject<Ref<Resource>>('resource')
const space = inject<Ref<SpaceResource>>('space')

const collaboratorShares = computed(() => {
  if (isProjectSpaceResource(unref(space))) {
    // filter out project space members, they are listed separately (see down below)
    return sharesStore.collaboratorShares.filter((c) => c.resourceId !== unref(space).id)
  }
  return sharesStore.collaboratorShares
})

const spaceMembers = computed(() => getSpaceMembers(unref(space)))

const sharesListCollapsed = ref(true)
const toggleShareListCollapsed = () => {
  sharesListCollapsed.value = !unref(sharesListCollapsed)
}
const memberListCollapsed = ref(true)
const toggleMemberListCollapsed = () => {
  memberListCollapsed.value = !unref(memberListCollapsed)
}

const matchingSpace = computed(() => {
  return getMatchingSpace(unref(resource))
})

const collaborators = computed(() => {
  const collaboratorsComparator = (c1: CollaboratorShare, c2: CollaboratorShare) => {
    // Sorted by: type, direct, display name, creation date
    const name1 = c1.sharedWith.displayName.toLowerCase().trim()
    const name2 = c2.sharedWith.displayName.toLowerCase().trim()
    const c1UserShare = ShareTypes.containsAnyValue(ShareTypes.individuals, [c1.shareType])
    const c2UserShare = ShareTypes.containsAnyValue(ShareTypes.individuals, [c2.shareType])
    const c1DirectShare = !c1.indirect
    const c2DirectShare = !c2.indirect

    if (c1UserShare === c2UserShare) {
      if (c1DirectShare === c2DirectShare) {
        return textUtils.naturalSortCompare(name1, name2)
      }

      return c1DirectShare ? -1 : 1
    }

    return c1UserShare ? -1 : 1
  }

  return unref(collaboratorShares).sort(collaboratorsComparator)
})

const inviteCollaboratorHelp = computed(() =>
  shareInviteCollaboratorHelp({
    configStore
  })
)

const helpersEnabled = computed(() => unref(configOptions).contextHelpers)
const sharedWithLabel = computed(() => $gettext('Shared with'))
const spaceMemberLabel = computed(() => $gettext('Space members'))
const collapseButtonTitle = computed(() =>
  unref(sharesListCollapsed) ? $gettext('Show more') : $gettext('Show less')
)
const collapseMemberButtonTitle = computed(() =>
  unref(memberListCollapsed) ? $gettext('Show more') : $gettext('Show less')
)
const hasSharees = computed(() => unref(collaborators).length > 0)
const displayCollaborators = computed(() => {
  if (unref(collaborators).length > 3 && unref(sharesListCollapsed)) {
    return unref(collaborators).slice(0, 3)
  }

  return unref(collaborators)
})
const displaySpaceMembers = computed(() => {
  if (unref(spaceMembers).length > 3 && unref(memberListCollapsed)) {
    return unref(spaceMembers).slice(0, 3)
  }

  return unref(spaceMembers)
})

const showShareToggle = computed(() => unref(collaborators).length > 3)
const showMemberToggle = computed(() => unref(spaceMembers).length > 3)
const noSharePermsMessage = computed(() => {
  const translatedFile = $gettext("You don't have permission to share this file.")
  const translatedFolder = $gettext("You don't have permission to share this folder.")
  return unref(resource).type === 'file' ? translatedFile : translatedFolder
})
const showSpaceMembers = computed(() => {
  return isProjectSpaceResource(unref(space)) && unref(resource).type !== 'space'
})

const deleteShareConfirmation = (collaboratorShare: CollaboratorShare) => {
  dispatchModal({
    title: $gettext('Remove share'),
    confirmText: $gettext('Remove'),
    message: $gettext('Are you sure you want to remove this share?'),
    hasInput: false,
    onConfirm: async () => {
      const lastShareId = unref(collaborators).length === 1 ? unref(collaborators)[0].id : undefined

      try {
        await deleteShare({
          clientService,
          space: unref(space),
          resource: unref(resource),
          collaboratorShare
        })

        showMessage({
          title: $gettext('Share was removed successfully')
        })
        if (lastShareId && isLocationSharesActive(router, 'files-shares-with-others')) {
          removeResources([{ id: lastShareId }] as Resource[])
        }
      } catch (error) {
        console.error(error)
        showErrorMessage({
          title: $gettext('Failed to remove share'),
          errors: [error]
        })
      }
    }
  })
}

const getSharedParentRoute = (collaborator: CollaboratorShare) => {
  if (!collaborator.indirect) {
    return null
  }
  const sharedAncestor = getAncestorById(collaborator.resourceId)
  if (!sharedAncestor) {
    return null
  }

  return getSharedAncestorRoute({
    sharedAncestor,
    matchingSpace: unref(space) || unref(matchingSpace)
  })
}

const isShareModifiable = (collaborator: CollaboratorShare) => {
  if (collaborator.indirect || collaborator.shareType === ShareTypes.remote.value) {
    return false
  }

  if (isProjectSpaceResource(unref(space)) || isShareSpaceResource(unref(space))) {
    return unref(space).canShare({ user: unref(user) })
  }

  return true
}

const isShareRemovable = (collaborator: CollaboratorShare) => {
  if (collaborator.indirect) {
    return false
  }

  if (isProjectSpaceResource(unref(space)) || isShareSpaceResource(unref(space))) {
    return unref(space).canShare({ user: unref(user) })
  }

  return true
}
</script>

<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  #files-collaborators-list > li {
    @apply pt-2;
  }
}
</style>
