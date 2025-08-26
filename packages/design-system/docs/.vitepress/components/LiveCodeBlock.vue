<template>
  <div class="live-code-block mt-6 mb-12">
    <div class="live-code-block-header mb-4">
      <oc-button
        @click="() => (previewActive = true)"
        appearance="raw"
        :class="{ active: previewActive }"
        no-hover
        >Preview</oc-button
      >
      <oc-button
        @click="() => (previewActive = false)"
        appearance="raw"
        :class="{ active: !previewActive }"
        no-hover
        >Code</oc-button
      >
    </div>
    <div :class="{ 'oc-hidden': !previewActive }">
      <component :is="preview" />
    </div>
    <div ref="slot" :class="{ 'oc-hidden': previewActive }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CompilerError } from '@vue/compiler-dom'
import { computed, unref, useTemplateRef, compile, ref, onMounted } from 'vue'

const { path } = defineProps<{
  path?: string // path to an external code example component. needs to be relative to the docs root folder.
}>()

const slot = useTemplateRef<HTMLElement>('slot')
const preview = ref()
const previewActive = ref(true)

const components = import.meta.glob('./../../components/**/*.vue')

const computedPath = computed(() => {
  if (!path) {
    return ''
  }
  // file extension needs to be removed and re-added manually to avoid compiler warnings
  const previewPath = path.startsWith('/') ? path.slice(1) : path
  const fileExtension = previewPath.split('.').pop()
  const previewPathWithoutExtension = previewPath.slice(0, -(fileExtension?.length || 1) - 1)
  return `../../${previewPathWithoutExtension}.${fileExtension}`
})

const lang = computed(() => {
  // extracts language from code block
  const htmlStr = unref(slot)?.innerHTML
  if (!htmlStr) {
    return ''
  }
  const regex = /<span class="lang">([^<]+)<\/span>/
  const match = htmlStr.match(regex)
  if (match) {
    return match[1]
  }
  return ''
})

onMounted(async () => {
  if (path && components[unref(computedPath)]) {
    const previewComponent = await components[unref(computedPath)]()
    preview.value = previewComponent.default
    return
  }

  const textContent = unref(slot)?.textContent
  if (!textContent) {
    return ''
  }
  const templateStr = textContent.substring(unref(lang).length)
  preview.value = compile(templateStr, {
    whitespace: 'preserve',
    onError: (error: CompilerError) => {
      console.error(error)
    }
  })
})
</script>

<style lang="scss" scoped>
.live-code-block-header {
  border-bottom: 1px solid var(--vp-c-divider);
  button {
    border-radius: 0;
  }
  button.active {
    border-bottom: 2px solid var(--vp-c-brand-1);
  }
}
</style>
