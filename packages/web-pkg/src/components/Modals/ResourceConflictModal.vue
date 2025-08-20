<template>
  <span class="oc-display-inline-block mb-4" v-text="message" />
  <div class="my-4">
    <oc-checkbox
      v-if="conflictCount > 1"
      v-model="checkboxValue"
      size="medium"
      :label="checkboxLabel"
      :aria-label="checkboxLabel"
    />
  </div>
  <div class="flex justify-end items-center mt-4">
    <div class="oc-modal-body-actions-grid">
      <oc-button class="oc-modal-body-actions-cancel ml-2" @click="onCancel">
        {{ $gettext('Skip') }}
      </oc-button>
      <oc-button class="oc-modal-body-actions-secondary ml-2" @click="onConfirmSecondary">
        {{ confirmSecondaryText }}
      </oc-button>
      <oc-button class="oc-modal-body-actions-confirm ml-2" appearance="filled" @click="onConfirm">
        {{ $gettext('Keep both') }}
      </oc-button>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Modal, useModals } from '../../composables'
import { Resource } from '@opencloud-eu/web-client'
import { ResolveConflict, ResolveStrategy } from '../../helpers/resource'

export default defineComponent({
  name: 'ResourceConflictModal',
  props: {
    modal: { type: Object as PropType<Modal>, required: true },
    resource: { type: Object as PropType<Resource>, required: true },
    conflictCount: { type: Number, required: true },
    callbackFn: {
      type: Function as PropType<(resolveConflict: ResolveConflict) => void>,
      required: true
    },
    suggestMerge: { type: Boolean, default: true },
    separateSkipHandling: { type: Boolean, default: false },
    confirmSecondaryTextOverwrite: { type: String, default: null }
  },
  setup(props) {
    const { removeModal } = useModals()
    const { $gettext } = useGettext()

    const checkboxValue = ref(false)
    const checkboxLabel = computed(() => {
      if (props.conflictCount < 2) {
        return ''
      }
      if (!props.separateSkipHandling) {
        return $gettext(
          'Apply to all %{count} conflicts',
          { count: props.conflictCount.toString() },
          true
        )
      } else if (props.resource.isFolder) {
        return $gettext(
          'Apply to all %{count} folders',
          { count: props.conflictCount.toString() },
          true
        )
      } else {
        return $gettext(
          'Apply to all %{count} files',
          { count: props.conflictCount.toString() },
          true
        )
      }
    })

    const message = computed(() =>
      props.resource.isFolder
        ? $gettext(
            'Folder with name »%{name}« already exists.',
            { name: props.resource.name },
            true
          )
        : $gettext('File with name »%{name}« already exists.', { name: props.resource.name }, true)
    )

    const confirmSecondaryText = computed(() => {
      return props.confirmSecondaryTextOverwrite || $gettext('Replace')
    })

    const onConfirm = () => {
      removeModal(props.modal.id)
      props.callbackFn({
        strategy: ResolveStrategy.KEEP_BOTH,
        doForAllConflicts: unref(checkboxValue)
      })
    }

    const onConfirmSecondary = () => {
      removeModal(props.modal.id)
      const strategy = props.suggestMerge ? ResolveStrategy.MERGE : ResolveStrategy.REPLACE
      props.callbackFn({
        strategy,
        doForAllConflicts: unref(checkboxValue)
      })
    }

    const onCancel = () => {
      removeModal(props.modal.id)
      props.callbackFn({
        strategy: ResolveStrategy.SKIP,
        doForAllConflicts: unref(checkboxValue)
      })
    }

    return {
      message,
      checkboxValue,
      checkboxLabel,
      confirmSecondaryText,
      onConfirm,
      onConfirmSecondary,
      onCancel
    }
  }
})
</script>
