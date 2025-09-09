<template>
  <div class="flex gap-1">
    <oc-tag
      v-for="tag in app.tags"
      :key="`app-tag-${app.id}-${tag}`"
      data-testid="tag-button"
      size="small"
      class="whitespace-nowrap"
      type="button"
      @click="emitClick(tag)"
    >
      <span class="mark-element">{{ tag }}</span>
    </oc-tag>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { App } from '../types'

export default defineComponent({
  name: 'AppTags',
  props: {
    app: {
      type: Object as PropType<App>,
      required: true,
      default: (): App => undefined
    }
  },
  emits: ['click'],
  setup(props, { emit }) {
    const emitClick = (tagName: string) => {
      emit('click', tagName)
    }

    return {
      emitClick
    }
  }
})
</script>
