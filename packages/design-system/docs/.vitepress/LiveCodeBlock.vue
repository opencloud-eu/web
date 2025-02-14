<template>
  <div class="live-code-block oc-mt-l oc-mb-xl">
    <div class="live-code-block-header oc-mb-m">
      <oc-button
        @click="() => (previewActive = true)"
        appearance="raw"
        :class="{ active: previewActive }"
        class="oc-px-m oc-pb-s"
        >Preview</oc-button
      >
      <oc-button
        @click="() => (previewActive = false)"
        appearance="raw"
        :class="{ active: !previewActive }"
        class="oc-px-m oc-pb-s"
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
import { computed, unref, useTemplateRef, compile, ref } from 'vue'

const slot = useTemplateRef<HTMLElement>('slot')

const previewActive = ref(true)

const preview = computed(() => {
  const textContent = unref(slot)?.textContent
  if (!textContent) {
    return ''
  }
  const templateStr = textContent.substring(unref(lang).length)
  return compile(templateStr, {
    whitespace: 'preserve',
    onError: (error: CompilerError) => {
      console.error(error)
    }
  })
})

const lang = computed(() => {
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
