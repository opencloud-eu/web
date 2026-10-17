<template>
  <quota-select
    :total-quota="selectedQuota"
    :max-quota="spacesMaxQuota"
    :position-fixed="true"
    @selected-option-change="changeSelectedQuotaOption"
  />
  <div v-if="warningMessage" class="mt-2">
    <span class="oc-text-input-warning" v-text="warningMessage" />
    <oc-contextual-helper
      v-if="warningMessageContextualHelperData"
      class="pl-1"
      v-bind="warningMessageContextualHelperData"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, unref } from 'vue'
import { watchImmediate } from '@vueuse/core'
import { useGettext } from 'vue3-gettext'
import QuotaSelect from '../QuotaSelect.vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import {
  Modal,
  useClientService,
  useMessages,
  useSpacesStore,
  useCapabilityStore,
  useResourcesStore,
  useRouter
} from '../../composables'
import { isPromiseFulfilled, isPromiseRejected } from '../../helpers'
import { eventBus } from '../../services'
import { ContextualHelperData } from '@opencloud-eu/design-system/helpers'
import { storeToRefs } from 'pinia'

const {
  spaces,
  warningMessage = '',
  warningMessageContextualHelperData = undefined,
  resourceType = 'space'
} = defineProps<{
  modal: Modal
  spaces: SpaceResource[]
  warningMessage?: string
  warningMessageContextualHelperData?: ContextualHelperData
  resourceType?: string
}>()

const emit = defineEmits<{
  (e: 'update:confirmDisabled', value: boolean): void
}>()

const { showMessage, showErrorMessage } = useMessages()
const { $gettext, $ngettext } = useGettext()
const clientService = useClientService()
const router = useRouter()
const spacesStore = useSpacesStore()
const capabilityStore = useCapabilityStore()
const { spacesMaxQuota } = storeToRefs(capabilityStore)
const { updateResourceField } = useResourcesStore()

const selectedQuota = ref(spaces[0]?.spaceQuota?.total || 0)

function getSuccessMessage(count: number) {
  if (resourceType === 'space') {
    return $ngettext(
      'Space quota was changed successfully',
      'Quota of %{count} spaces was changed successfully',
      count,
      { count: count.toString() }
    )
  }
  if (resourceType === 'user') {
    return $ngettext(
      'User quota was changed successfully',
      'Quota of %{count} users was changed successfully',
      count,
      { count: count.toString() }
    )
  }
  return $gettext('Quota was changed successfully')
}

function getErrorMessage(count: number) {
  if (resourceType === 'space') {
    return $ngettext(
      'Failed to change space quota',
      'Failed to change quota for %{count} spaces',
      count,
      { count: count.toString() }
    )
  }
  if (resourceType === 'user') {
    return $ngettext(
      'Failed to change user quota',
      'Failed to change quota for %{count} users',
      count,
      { count: count.toString() }
    )
  }
  return $gettext('Failed to change quota')
}

const confirmButtonDisabled = computed(() => {
  return !spaces.some((space) => space.spaceQuota.total !== unref(selectedQuota))
})

watchImmediate(confirmButtonDisabled, (disabled) => {
  emit('update:confirmDisabled', disabled)
})

function changeSelectedQuotaOption(option: { value: number | null }) {
  // The backend cannot reset an existing drive to its default quota yet.
  if (option.value === null) {
    return
  }
  selectedQuota.value = option.value
}

async function updateQuota(space: SpaceResource, total: number) {
  const updatedSpace = await clientService.graphAuthenticated.drives.updateDrive(space.id, {
    quota: { total }
  })
  if (unref(router.currentRoute).name === 'admin-settings-users') {
    eventBus.publish('app.admin-settings.users.user.quota.updated', {
      spaceId: space.id,
      quota: updatedSpace.spaceQuota
    })
  }
  spacesStore.updateSpaceField({
    id: space.id,
    field: 'spaceQuota',
    value: updatedSpace.spaceQuota
  })
  updateResourceField<SpaceResource>({
    id: space.id,
    field: 'spaceQuota',
    value: updatedSpace.spaceQuota
  })
}

async function onConfirm() {
  const quota = unref(selectedQuota)
  const results = await Promise.allSettled(spaces.map((space) => updateQuota(space, quota)))
  const succeeded = results.filter(isPromiseFulfilled)
  if (succeeded.length) {
    showMessage({ title: getSuccessMessage(succeeded.length) })
  }
  const errors = results.filter(isPromiseRejected)
  if (errors.length) {
    errors.forEach(console.error)
    showErrorMessage({
      title: getErrorMessage(errors.length),
      errors: errors.map((f) => f.reason)
    })
  }
}

defineExpose({ onConfirm })
</script>
