<template>
  <group-select
    :selected-groups="selectedOptions"
    :group-options="availableGroups"
    :position-fixed="true"
    required-mark
    @selected-option-change="changeSelectedGroupOption"
  />
</template>

<script setup lang="ts">
import { computed, Ref, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import GroupSelect from './GroupSelect.vue'
import {
  useClientService,
  Modal,
  useMessages,
  isPromiseFulfilled,
  isPromiseRejected
} from '@opencloud-eu/web-pkg'
import { useUserSettingsStore } from '../../composables/stores/userSettings'

const { groups, users } = defineProps<{
  modal: Modal
  groups: Group[]
  users: User[]
}>()

const emit = defineEmits<{
  (e: 'update:confirmDisabled', value: boolean): void
}>()

const { showMessage, showErrorMessage } = useMessages()
const clientService = useClientService()
const { $gettext, $ngettext } = useGettext()
const userSettingsStore = useUserSettingsStore()

const selectedOptions: Ref<Group[]> = ref([])
const changeSelectedGroupOption = (options: Group[]) => {
  selectedOptions.value = options
}

const availableGroups = computed(() => {
  if (users.length > 1) {
    // return all groups if multiple users are selected since we don't want to compute the intersection
    return groups
  }
  return groups.filter(
    (group) => !users.some((user) => user.memberOf.some(({ id }) => id === group.id))
  )
})

watch(
  selectedOptions,
  () => {
    emit('update:confirmDisabled', !unref(selectedOptions).length)
  },
  { immediate: true }
)

const onConfirm = async () => {
  const client = clientService.graphAuthenticated
  const usersToFetch: string[] = []
  const promises = unref(selectedOptions).reduce((acc, group) => {
    for (const user of users) {
      if (!user.memberOf.find((userGroup) => userGroup.id === group.id)) {
        acc.push(client.groups.addMember(group.id, user.id))
        if (!usersToFetch.includes(user.id)) {
          usersToFetch.push(user.id)
        }
      }
    }
    return acc
  }, [])

  if (!promises.length) {
    const title = $ngettext(
      'Group assignment already added',
      'Group assignments already added',
      users.length * unref(selectedOptions).length
    )
    showMessage({ title })
    return
  }

  const results = await Promise.allSettled(promises)

  const succeeded = results.filter(isPromiseFulfilled)
  if (succeeded.length) {
    const title =
      succeeded.length === 1 && unref(selectedOptions).length === 1 && users.length === 1
        ? $gettext('Group assignment "%{group}" was added successfully', {
            group: unref(selectedOptions)[0].displayName
          })
        : $ngettext(
            '%{groupAssignmentCount} group assignment was added successfully',
            '%{groupAssignmentCount} group assignments were added successfully',
            succeeded.length,
            { groupAssignmentCount: succeeded.length.toString() },
            true
          )
    showMessage({ title })
  }

  const failed = results.filter(isPromiseRejected)
  if (failed.length) {
    failed.forEach(console.error)

    const title =
      failed.length === 1 && unref(selectedOptions).length === 1 && users.length === 1
        ? $gettext('Failed to add group assignment "%{group}"', {
            group: unref(selectedOptions)[0].displayName
          })
        : $ngettext(
            'Failed to add %{groupAssignmentCount} group assignment',
            'Failed to add %{groupAssignmentCount} group assignments',
            failed.length,
            { groupAssignmentCount: failed.length.toString() },
            true
          )
    showErrorMessage({
      title,
      errors: failed.map((f) => f.reason)
    })
  }

  try {
    const usersResponse = await Promise.all(
      usersToFetch.map((userId) => client.users.getUser(userId))
    )

    usersResponse.forEach((user) => {
      userSettingsStore.upsertUser(user)
    })
  } catch (e) {
    console.error(e)
  }
}

defineExpose({ onConfirm })
</script>
