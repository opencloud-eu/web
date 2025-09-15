<template>
  <div class="w-full flex flex-row flex-wrap justify-between items-center">
    <span v-if="saved" class="flex items-center">
      <oc-icon name="checkbox-circle" />
      <span class="ml-2" v-text="$gettext('Changes saved')" />
    </span>
    <span v-else>{{ unsavedChangesText }}</span>
    <div>
      <oc-button
        :disabled="!unsavedChanges"
        class="compare-save-dialog-revert-btn"
        @click="$emit('revert')"
      >
        <span v-text="$gettext('Revert')" />
      </oc-button>
      <oc-button
        appearance="filled"
        class="compare-save-dialog-confirm-btn"
        :disabled="!unsavedChanges || confirmButtonDisabled"
        @click="$emit('confirm')"
      >
        <span v-text="$gettext('Save')" />
      </oc-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import isEqual from 'lodash-es/isEqual'
import { eventBus } from '../../services/eventBus'

export default defineComponent({
  name: 'CompareSaveDialog',
  props: {
    originalObject: {
      type: Object,
      required: true
    },
    compareObject: {
      type: Object,
      required: true
    },
    confirmButtonDisabled: {
      type: Boolean,
      default: () => {
        return false
      }
    }
  },
  emits: ['confirm', 'revert'],
  setup() {
    const saved = ref(false)
    let savedEventToken: string

    onMounted(() => {
      savedEventToken = eventBus.subscribe('sidebar.entity.saved', () => {
        saved.value = true
      })
    })

    onBeforeUnmount(() => {
      eventBus.unsubscribe('sidebar.entity.saved', savedEventToken)
    })

    return { saved }
  },
  computed: {
    unsavedChanges() {
      return !isEqual(this.originalObject, this.compareObject)
    },
    unsavedChangesText() {
      return this.unsavedChanges ? this.$gettext('Unsaved changes') : this.$gettext('No changes')
    }
  },
  watch: {
    unsavedChanges() {
      if (this.unsavedChanges) {
        this.saved = false
      }
    },
    'originalObject.id': function () {
      this.saved = false
    }
  }
})
</script>
