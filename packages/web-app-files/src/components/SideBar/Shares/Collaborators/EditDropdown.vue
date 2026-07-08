<template>
  <div class="flex items-center">
    <oc-button
      :id="editShareBtnId"
      v-oc-tooltip="dropButtonTooltip"
      class="collaborator-edit-dropdown-options-btn raw-hover-surface p-1"
      :aria-label="
        isLocked ? dropButtonTooltip : $gettext('Open context menu with share editing options')
      "
      appearance="raw"
      :disabled="isLocked"
    >
      <oc-icon name="more-2" />
    </oc-button>
    <oc-drop
      ref="expirationDateDrop"
      :title="$gettext('Edit share')"
      :toggle="'#' + editShareBtnId"
      mode="click"
      padding-size="small"
      close-on-click
    >
      <oc-list
        class="collaborator-edit-dropdown-options-list"
        :aria-label="$gettext('Context menu of the share')"
      >
        <li v-for="(option, i) in options" :key="i">
          <context-menu-item :option="option" />
        </li>
        <li v-if="sharedParentRoute">
          <context-menu-item :option="navigateToParentOption" />
        </li>
      </oc-list>
      <oc-list
        v-if="canRemove"
        class="collaborator-edit-dropdown-options-list collaborator-edit-dropdown-options-list-remove mt-2 pt-2 border-t"
      >
        <li>
          <context-menu-item :option="removeShareOption" />
        </li>
      </oc-list>
    </oc-drop>
    <oc-info-drop
      ref="accessDetailsDrop"
      :toggle="'#' + editShareBtnId"
      class="share-access-details-drop [&_dl]:grid [&_dl]:gap-x-4 [&_dl]:gap-y-1 [&_dl]:grid-cols-[max-content_auto] [&_dt]:col-start-1 [&_dd]:col-start-2"
      v-bind="{
        title: $gettext('Access details'),
        list: accessDetails
      }"
      mode="manual"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, markRaw, Ref, unref, useTemplateRef } from 'vue'
import { DateTime } from 'luxon'
import { ContextualHelperDataListItem, uniqueId } from '@opencloud-eu/design-system/helpers'
import { OcDrop, OcInfoDrop } from '@opencloud-eu/design-system/components'
import { Resource } from '@opencloud-eu/web-client'
import { isProjectSpaceResource } from '@opencloud-eu/web-client'
import { useModals, DatePickerModal } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { RouteLocationNamedRaw } from 'vue-router'
import ContextMenuItem from './ContextMenuItem.vue'

export type EditOption = {
  icon: string
  title: string
  additionalAttributes?: Record<string, string>
  class?: string
  isChecked?: Ref<boolean>
  method?: () => void
  to?: RouteLocationNamedRaw
}

const {
  expirationDate = undefined,
  shareCategory = null,
  canEdit,
  canRemove,
  accessDetails,
  isLocked = false,
  sharedParentRoute = undefined
} = defineProps<{
  expirationDate?: string
  shareCategory?: 'user' | 'group' | null
  canEdit: boolean
  canRemove: boolean
  accessDetails: ContextualHelperDataListItem[]
  isLocked?: boolean
  sharedParentRoute?: RouteLocationNamedRaw
}>()

const emit = defineEmits<{
  (e: 'expirationDateChanged', payload: { expirationDateTime: DateTime | null }): void
  (e: 'removeShare'): void
}>()

const language = useGettext()
const { $gettext } = language
const { dispatchModal } = useModals()
const expirationDateDrop = useTemplateRef<typeof OcDrop>('expirationDateDrop')
const accessDetailsDrop = useTemplateRef<typeof OcInfoDrop>('accessDetailsDrop')

const resource = inject<Ref<Resource>>('resource')

const dropButtonTooltip = computed(() => {
  if (isLocked) {
    return $gettext('Resource is temporarily locked, unable to manage share')
  }

  return ''
})

const navigateToParentOption = computed<EditOption>(() => {
  return {
    title: $gettext('Navigate to parent'),
    icon: 'folder-shared',
    class: 'navigate-to-parent',
    to: sharedParentRoute
  }
})

const removeShareOption = computed<EditOption>(() => {
  return {
    title: isProjectSpaceResource(unref(resource))
      ? $gettext('Remove member')
      : $gettext('Remove share'),
    method: () => {
      emit('removeShare')
    },
    class: 'remove-share',
    icon: 'delete-bin-5',
    additionalAttributes: {
      'data-testid': 'collaborator-remove-share-btn'
    }
  }
})

const options = computed(() => {
  const result: EditOption[] = [
    {
      title: $gettext('Access details'),
      method: () => unref(accessDetailsDrop)?.$refs.drop.show(),
      icon: 'information',
      class: 'show-access-details'
    }
  ]

  if (canEdit && unref(isExpirationSupported)) {
    result.push({
      title: unref(isExpirationDateSet)
        ? $gettext('Edit expiration date')
        : $gettext('Set expiration date'),
      class: 'set-expiration-date recipient-datepicker-btn',
      icon: 'calendar-event',
      method: showDatePickerModal
    })
  }

  if (unref(isRemoveExpirationPossible)) {
    result.push({
      title: $gettext('Remove expiration date'),
      class: 'remove-expiration-date',
      icon: 'calendar-close',
      method: removeExpirationDate
    })
  }

  return result
})

const editShareBtnId = computed(() => {
  return uniqueId('files-collaborators-edit-button-')
})
const editingUser = computed(() => {
  return shareCategory === 'user'
})
const editingGroup = computed(() => {
  return shareCategory === 'group'
})
const isExpirationSupported = computed(() => {
  return unref(editingUser) || unref(editingGroup)
})
const isExpirationDateSet = computed(() => {
  return !!expirationDate
})
const isRemoveExpirationPossible = computed(() => {
  return canEdit && unref(isExpirationSupported) && unref(isExpirationDateSet)
})

const removeExpirationDate = () => {
  emit('expirationDateChanged', { expirationDateTime: null })
  unref(expirationDateDrop)?.hide()
}
const showDatePickerModal = () => {
  const currentDate = DateTime.fromISO(expirationDate ?? '')

  dispatchModal({
    title: $gettext('Set expiration date'),
    hideActions: true,
    customComponent: markRaw(DatePickerModal),
    customComponentAttrs: () => ({
      currentDate: currentDate.isValid ? currentDate : null,
      minDate: DateTime.now()
    }),
    onConfirm: (expirationDateTime: DateTime) => {
      emit('expirationDateChanged', {
        expirationDateTime
      })
    }
  })
}
</script>
