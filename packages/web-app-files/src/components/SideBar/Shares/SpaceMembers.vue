<template>
  <div id="oc-files-sharing-sidebar" class="relative rounded-sm">
    <div class="flex">
      <div v-if="canShare({ space: resource, resource })" class="flex">
        <h3 class="font-semibold text-base m-0" v-text="$gettext('Add members')" />
        <oc-contextual-helper v-if="helpersEnabled" class="pl-1" v-bind="spaceAddMemberHelp" />
      </div>
      <copy-private-link :resource="resource" class="ml-auto" />
    </div>
    <invite-collaborator-form
      v-if="canShare({ space: resource, resource })"
      key="new-collaborator"
      :save-button-label="$gettext('Add')"
      :invite-label="$gettext('Search')"
      class="mt-2"
    />
    <template v-if="hasCollaborators">
      <div
        id="files-collaborators-headline"
        class="flex items-center justify-between relative h-10 mt-2"
      >
        <div class="flex">
          <h4 class="font-semibold my-0" v-text="$gettext('Members')" />
          <oc-button
            v-oc-tooltip="$gettext('Filter members')"
            class="open-filter-btn ml-2"
            :aria-label="$gettext('Filter members')"
            appearance="raw"
            :aria-expanded="isFilterOpen"
            @click="toggleFilter"
          >
            <oc-icon name="search" fill-type="line" size="small" />
          </oc-button>
        </div>
      </div>
      <div
        class="flex justify-between space-members-filter-container max-h-0"
        :class="{
          'space-members-filter-container-expanded visible max-h-15 mb-4': isFilterOpen,
          invisible: !isFilterOpen
        }"
      >
        <oc-text-input
          ref="filterInput"
          v-model="filterTerm"
          class="space-members-filter mr-2 w-full overflow-hidden [&_label]:text-sm"
          :label="$gettext('Filter members')"
          :clear-button-enabled="true"
        />
        <oc-button
          v-oc-tooltip="$gettext('Close filter')"
          class="close-filter-btn mt-4 raw-hover-surface"
          :aria-label="$gettext('Close filter')"
          appearance="raw"
          @click="toggleFilter"
        >
          <oc-icon name="arrow-up-s" fill-type="line" />
        </oc-button>
      </div>

      <ul
        id="files-collaborators-list"
        ref="collaboratorList"
        class="oc-list oc-list-divider m-0"
        :aria-label="$gettext('Space members')"
      >
        <li v-for="collaborator in filteredSpaceMembers" :key="collaborator.id">
          <collaborator-list-item
            :share="collaborator"
            :modifiable="isModifiable(collaborator)"
            :removable="isModifiable(collaborator)"
            :is-space-share="true"
            @on-delete="deleteMemberConfirm(collaborator)"
          />
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CollaboratorListItem from './Collaborators/ListItem.vue'
import InviteCollaboratorForm from './Collaborators/InviteCollaborator/InviteCollaboratorForm.vue'
import { GraphSharePermission } from '@opencloud-eu/web-client'
import {
  createLocationSpaces,
  isLocationSpacesActive,
  useCanShare,
  useConfigStore,
  useMessages,
  useModals,
  useRouter,
  useSharesStore,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { computed, inject, nextTick, ref, Ref, unref, useTemplateRef, watch } from 'vue'
import { shareSpaceAddMemberHelp } from '../../../helpers/contextualHelpers'
import { ProjectSpaceResource, CollaboratorShare } from '@opencloud-eu/web-client'
import { useClientService } from '@opencloud-eu/web-pkg'
import Fuse from 'fuse.js'
import Mark from 'mark.js'
import { defaultFuseOptions } from '@opencloud-eu/web-pkg'
import CopyPrivateLink from '../../Shares/CopyPrivateLink.vue'
import { OcTextInput } from '@opencloud-eu/design-system/components'
import { useGettext } from 'vue3-gettext'

const filterInput = useTemplateRef<typeof OcTextInput>('filterInput')
const collaboratorList = useTemplateRef<HTMLUListElement>('collaboratorList')

const userStore = useUserStore()
const clientService = useClientService()
const { canShare } = useCanShare()
const { dispatchModal } = useModals()
const sharesStore = useSharesStore()
const { deleteShare } = sharesStore
const spacesStore = useSpacesStore()
const { upsertSpace, getSpaceMembers } = spacesStore
const { showMessage, showErrorMessage } = useMessages()
const router = useRouter()
const { $gettext } = useGettext()
const configStore = useConfigStore()

const { user } = storeToRefs(userStore)

const markInstance = ref<Mark>()
const filterTerm = ref('')
const isFilterOpen = ref(false)

const resource = inject<Ref<ProjectSpaceResource>>('resource')

const spaceMembers = computed(() => getSpaceMembers(unref(resource)))

const filter = (collection: CollaboratorShare[], term: string) => {
  if (!(term || '').trim()) {
    return collection
  }
  const searchEngine = new Fuse(collection, {
    ...defaultFuseOptions,
    keys: ['sharedWith.displayName', 'sharedWith.name']
  })

  return searchEngine.search(term).map((r) => r.item)
}

const toggleFilter = async () => {
  isFilterOpen.value = !unref(isFilterOpen)
  if (unref(isFilterOpen)) {
    await nextTick()
    unref(filterInput).focus()
  }
}

const isModifiable = (share: CollaboratorShare) => {
  if (!canShare({ space: unref(resource), resource: unref(resource) })) {
    return false
  }

  const memberCanUpdateMembers = share.permissions.includes(GraphSharePermission.updatePermissions)
  if (!memberCanUpdateMembers) {
    return true
  }

  // make sure at least one member can edit other members
  const managers = unref(spaceMembers).filter(({ permissions }) =>
    permissions.includes(GraphSharePermission.updatePermissions)
  )
  return managers.length > 1
}

const filteredSpaceMembers = computed(() => {
  return filter(unref(spaceMembers), unref(filterTerm))
})
const helpersEnabled = computed(() => {
  return configStore.options.contextHelpers
})
const spaceAddMemberHelp = computed(() => {
  return shareSpaceAddMemberHelp({ configStore: configStore })
})
const hasCollaborators = computed(() => {
  return unref(spaceMembers).length > 0
})

const deleteMemberConfirm = (share: CollaboratorShare) => {
  dispatchModal({
    title: $gettext('Remove member'),
    confirmText: $gettext('Remove'),
    message: $gettext('Are you sure you want to remove this member?'),
    hasInput: false,
    onConfirm: async () => {
      try {
        const currentUserRemoved = share.sharedWith.id === unref(user).id
        await deleteShare({
          clientService: clientService,
          space: unref(resource),
          resource: unref(resource),
          collaboratorShare: share
        })

        if (!currentUserRemoved) {
          const client = clientService.graphAuthenticated
          const space = await client.drives.getDrive(share.resourceId)
          upsertSpace({ ...space, graphPermissions: unref(resource).graphPermissions })
        }

        showMessage({
          title: $gettext('Share was removed successfully')
        })

        if (currentUserRemoved) {
          if (isLocationSpacesActive(router, 'files-spaces-projects')) {
            router.go(0)
            return
          }
          await router.push(createLocationSpaces('files-spaces-projects'))
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

watch(isFilterOpen, () => {
  filterTerm.value = ''
})

watch(filterTerm, async () => {
  await nextTick()

  if (unref(collaboratorList)) {
    markInstance.value = new Mark(unref(collaboratorList))
    markInstance.value.unmark()
    markInstance.value.mark(unref(filterTerm), {
      element: 'span',
      className: 'mark-highlight'
    })
  }
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .space-members-filter input:focus {
    @apply border border-role-outline outline-0 inset-ring-1 ring-role-outline;
  }
  .space-members-filter-container {
    transition:
      max-height 0.25s ease-in-out,
      margin-bottom 0.25s ease-in-out,
      visibility 0.25s ease-in-out;
  }
  .space-members-filter-container-expanded {
    transition:
      max-height 0.25s ease-in-out,
      margin-bottom 0.25s ease-in-out,
      visibility 0s;
  }
}
</style>
