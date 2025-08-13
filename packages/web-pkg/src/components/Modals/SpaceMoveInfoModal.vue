<template>
  <p
    class="mt-0"
    v-text="
      $gettext(
        'Moving files from one space to another is not possible. Do you want to copy instead?'
      )
    "
  />
  <p
    class="mb-0"
    v-text="$gettext('Note: Links and shares of the original file are not copied.')"
  />
</template>

<script lang="ts">
import { Modal } from '../../composables/piniaStores'
import { PropType, defineComponent } from 'vue'

export default defineComponent({
  name: 'SpaceMoveInfoModal',
  props: {
    modal: { type: Object as PropType<Modal>, required: true }
  }
})
</script>
