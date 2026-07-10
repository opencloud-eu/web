<template>
  <div v-if="isModifiable || sharedAncestor" class="flex">
    <oc-button
      :id="`edit-public-link-dropdown-toggl-${linkShare.id}`"
      :aria-label="$gettext('More options')"
      appearance="raw"
      class="edit-drop-trigger raw-hover-surface p-1"
    >
      <oc-icon name="more-2" />
    </oc-button>
    <oc-drop
      ref="editPublicLinkDropdown"
      :title="$gettext('Edit public link')"
      :drop-id="`edit-public-link-dropdown`"
      :toggle="`#edit-public-link-dropdown-toggl-${linkShare.id}`"
      padding-size="small"
      close-on-click
      mode="click"
    >
      <oc-list v-if="editOptions.length > 0">
        <li v-for="(option, i) in editOptions" :key="i">
          <context-menu-item :option="option" />
        </li>
      </oc-list>
      <oc-list
        v-if="sharedAncestor"
        class="edit-public-link-dropdown-menu-navigate-to-parent"
        :class="{ 'pt-2': editOptions.length > 0 }"
      >
        <li>
          <context-menu-item :option="navigateToParentOption" />
        </li>
      </oc-list>
      <oc-list
        v-if="isModifiable"
        class="edit-public-link-dropdown-menu-delete mt-2 border-t"
        :class="{ 'pt-2': editOptions.length > 0 }"
      >
        <li>
          <context-menu-item :option="deleteOption" />
        </li>
      </oc-list>
    </oc-drop>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import {
  createLocationSpaces,
  UpdateLinkOptions,
  useGetMatchingSpace,
  useModals,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { LinkShare } from '@opencloud-eu/web-client'
import { computed, inject, markRaw, Ref, unref, useTemplateRef } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { createFileRouteOptions, DatePickerModal } from '@opencloud-eu/web-pkg'
import { OcDrop } from '@opencloud-eu/design-system/components'
import { useGettext } from 'vue3-gettext'
import { RouteLocationNamedRaw } from 'vue-router'
import ContextMenuItem from './ContextMenuItem.vue'

export type EditOption = {
  id: string
  title: string
  icon: string
  method?: () => void
  to?: RouteLocationNamedRaw
}

const {
  linkShare,
  canRename = false,
  isModifiable = false,
  isPasswordRemovable = false
} = defineProps<{
  linkShare: LinkShare
  canRename?: boolean
  isModifiable?: boolean
  isPasswordRemovable?: boolean
}>()

const emit = defineEmits<{
  (e: 'removePublicLink', payload: { link: LinkShare }): void
  (
    e: 'updateLink',
    payload: {
      linkShare: LinkShare
      options: UpdateLinkOptions['options']
    }
  ): void
  (e: 'showPasswordModal'): void
}>()

const { dispatchModal } = useModals()
const { $gettext } = useGettext()
const { getMatchingSpace } = useGetMatchingSpace()
const resourcesStore = useResourcesStore()
const editPublicLinkDropdown = useTemplateRef<typeof OcDrop>('editPublicLinkDropdown')

const resource = inject<Ref<Resource>>('resource')

const showDatePickerModal = () => {
  const currentDate = DateTime.fromISO(linkShare.expirationDateTime)

  dispatchModal({
    title: $gettext('Set expiration date'),
    hideActions: true,
    customComponent: markRaw(DatePickerModal),
    customComponentAttrs: () => ({
      currentDate: currentDate.isValid ? currentDate : null,
      minDate: DateTime.now()
    }),
    onConfirm: (expirationDateTime: DateTime) => {
      emit('updateLink', {
        linkShare: { ...linkShare },
        options: { expirationDateTime: expirationDateTime.toISO() }
      })
    }
  })
}

const sharedAncestor = computed(() => {
  if (!linkShare.indirect) {
    return null
  }

  return resourcesStore.getAncestorById(linkShare.resourceId)
})

const viaRouterParams = computed(() => {
  const matchingSpace = getMatchingSpace(unref(resource))
  if (!matchingSpace || !unref(sharedAncestor)) {
    return {}
  }

  return createLocationSpaces(
    'files-spaces-generic',
    createFileRouteOptions(matchingSpace, {
      path: unref(sharedAncestor).path,
      fileId: unref(sharedAncestor).id
    })
  )
})

const deleteOption = computed<EditOption>(() => {
  return {
    id: 'delete',
    title: $gettext('Delete link'),
    method: () => {
      emit('removePublicLink', { link: linkShare })
      unref(editPublicLinkDropdown).hide()
    },
    icon: 'delete-bin-5'
  }
})

const navigateToParentOption = computed<EditOption>(() => {
  return {
    id: 'open-shared-via',
    title: $gettext('Navigate to parent'),
    icon: 'folder-shared',
    to: unref(viaRouterParams)
  }
})

const showRenameModal = () => {
  dispatchModal({
    title: $gettext('Edit name'),
    confirmText: $gettext('Save'),
    hasInput: true,
    inputValue: linkShare.displayName,
    inputLabel: $gettext('Link name'),
    inputRequiredMark: true,
    onInput: (name, setError) => {
      if (!name.length) {
        return setError($gettext('Link name cannot be empty'))
      }
      if (name.length > 255) {
        return setError($gettext('Link name cannot exceed 255 characters'))
      }
      return setError(null)
    },
    onConfirm: (displayName: string) => {
      emit('updateLink', { linkShare, options: { displayName } })
    }
  })
}

const editOptions = computed<EditOption[]>(() => {
  const result: EditOption[] = []

  if (!isModifiable) {
    return result
  }

  if (canRename) {
    result.push({
      id: 'rename',
      title: $gettext('Rename'),
      icon: 'pencil',
      method: showRenameModal
    })
  }

  if (linkShare.expirationDateTime) {
    result.push({
      id: 'edit-expiration',
      title: $gettext('Edit expiration date'),
      icon: 'calendar-event',
      method: showDatePickerModal
    })

    result.push({
      id: 'remove-expiration',
      title: $gettext('Remove expiration date'),
      icon: 'calendar-close',
      method: () => {
        emit('updateLink', {
          linkShare: { ...linkShare },
          options: { expirationDateTime: null }
        })
        unref(editPublicLinkDropdown).hide()
      }
    })
  } else {
    result.push({
      id: 'add-expiration',
      title: $gettext('Set expiration date'),
      method: showDatePickerModal,
      icon: 'calendar-event'
    })
  }

  if (linkShare.hasPassword) {
    result.push({
      id: 'edit-password',
      title: $gettext('Edit password'),
      icon: 'lock-password',
      method: () => emit('showPasswordModal')
    })

    if (isPasswordRemovable) {
      result.push({
        id: 'remove-password',
        title: $gettext('Remove password'),
        icon: 'lock-unlock',
        method: () => emit('updateLink', { linkShare, options: { password: '' } })
      })
    }
  }
  if (!linkShare.hasPassword) {
    result.push({
      id: 'add-password',
      title: $gettext('Add password'),
      icon: 'lock-password',
      method: () => emit('showPasswordModal')
    })
  }

  return result
})
</script>
