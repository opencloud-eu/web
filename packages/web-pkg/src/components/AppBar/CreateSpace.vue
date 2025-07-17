<template>
  <oc-button
    id="new-space-menu-btn"
    v-oc-tooltip="showLabel ? undefined : $gettext('New space')"
    :aria-label="showLabel ? undefined : $gettext('New space')"
    appearance="filled"
    @click="showCreateSpaceModal"
  >
    <oc-icon name="add" />
    <span v-if="showLabel" v-text="$gettext('New Space')" />
  </oc-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  useModals,
  useCreateSpace,
  useMessages,
  useSpacesStore,
  useResourcesStore,
  useIsResourceNameValid
} from '../../composables'

export default defineComponent({
  name: 'CreateSpace',
  props: {
    showLabel: {
      type: Boolean,
      default: true
    }
  },
  emits: ['spaceCreated'],
  setup(props, { emit }) {
    const { showMessage, showErrorMessage } = useMessages()
    const { $gettext } = useGettext()
    const { createSpace } = useCreateSpace()
    const { isSpaceNameValid } = useIsResourceNameValid()
    const { dispatchModal } = useModals()
    const spacesStore = useSpacesStore()
    const { upsertResource } = useResourcesStore()

    const addNewSpace = async (name: string) => {
      try {
        const createdSpace = await createSpace(name)
        upsertResource(createdSpace)
        spacesStore.upsertSpace(createdSpace)
        emit('spaceCreated', createdSpace)
        showMessage({ title: $gettext('Space was created successfully') })
      } catch (error) {
        console.error(error)
        showErrorMessage({
          title: $gettext('Creating space failed…'),
          errors: [error]
        })
      }
    }

    const showCreateSpaceModal = () => {
      dispatchModal({
        title: $gettext('Create a new space'),
        confirmText: $gettext('Create'),
        hasInput: true,
        inputLabel: $gettext('Space name'),
        inputValue: $gettext('New space'),
        inputRequiredMark: true,
        onConfirm: (name: string) => addNewSpace(name),
        onInput: (name: string, setError: (error: string) => void) => {
          const { isValid, error } = isSpaceNameValid(name)
          setError(isValid ? null : error)
        }
      })
    }

    return { showCreateSpaceModal }
  }
})
</script>
