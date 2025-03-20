<template>
  <div id="oc-files-sharing-sidebar" class="oc-position-relative">
    <div class="oc-flex">
      <div v-if="canShare({ space: resource, resource })" class="oc-flex oc-py-s">
        <h3 class="oc-text-bold oc-text-medium oc-m-rm" v-text="$gettext('Add members')" />
        <oc-contextual-helper v-if="helpersEnabled" class="oc-pl-xs" v-bind="spaceAddMemberHelp" />
      </div>
      <copy-private-link :resource="resource" />
    </div>
    <invite-collaborator-form
      v-if="canShare({ space: resource, resource })"
      key="new-collaborator"
      :save-button-label="$gettext('Add')"
      :invite-label="$gettext('Search')"
      class="oc-my-s"
    />
    <template v-if="hasCollaborators">
      <div
        id="files-collaborators-headline"
        class="oc-flex oc-flex-middle oc-flex-between oc-position-relative"
      >
        <div class="oc-flex">
          <h4 class="oc-text-bold oc-my-rm" v-text="$gettext('Members')" />
          <oc-button
            v-oc-tooltip="$gettext('Filter members')"
            class="open-filter-btn oc-ml-s"
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
        class="oc-flex oc-flex-between space-members-filter-container"
        :class="{ 'space-members-filter-container-expanded': isFilterOpen }"
      >
        <oc-text-input
          ref="filterInput"
          v-model="filterTerm"
          class="space-members-filter oc-mr-s oc-width-1-1"
          :label="$gettext('Filter members')"
          :clear-button-enabled="true"
        />
        <oc-button
          v-oc-tooltip="$gettext('Close filter')"
          class="close-filter-btn oc-mt-m raw-hover-surface"
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
        class="oc-list oc-list-divider oc-m-rm"
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
const { graphRoles } = storeToRefs(sharesStore)
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
          const space = await client.drives.getDrive(share.resourceId, unref(graphRoles))
          upsertSpace(space)
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

<style lang="scss">
#oc-files-sharing-sidebar {
  .copy-private-link {
    margin-left: auto;
  }
}

.space-members-filter {
  overflow: hidden;

  label {
    font-size: var(--oc-font-size-small);
  }

  input:focus {
    // use inner focus border because an outline would be cut off by the hidden overflow
    outline: 0px !important;
    border: 1px solid var(--oc-role-outline) !important;
    box-shadow: inset 0px 0px 0px 1px var(--oc-role-outline);
  }

  &-container {
    max-height: 0px;
    visibility: hidden;
    transition:
      max-height 0.25s ease-in-out,
      margin-bottom 0.25s ease-in-out,
      visibility 0.25s ease-in-out;

    &-expanded {
      max-height: 60px;
      visibility: visible;
      transition:
        max-height 0.25s ease-in-out,
        margin-bottom 0.25s ease-in-out,
        visibility 0s;
      margin-bottom: var(--oc-space-medium);
    }
  }
}

#files-collaborators-headline {
  height: 40px;
}
</style>
