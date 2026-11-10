<template>
  <oc-button class="my-4" @click="focus">Focus input below</oc-button>
  <oc-text-input ref="inputForFocusRef" label="Focus field" />
  <oc-button class="my-4" @click="focusAndSelect">Focus preselecting input below</oc-button>
  <oc-text-input
    ref="inputForFocusSelectRef"
    label="Preselect field"
    model-value="Selected until you click or type in here"
    preselect
  />
  <oc-text-input v-model="inputValueForClearing" label="Clear input" :clear-button-enabled="true" />
  <oc-text-input
    v-model="inputValueWithDefault"
    label="Input with default"
    :clear-button-enabled="true"
    default-value="Some default"
  />

  <p>Value: {{ inputValueWithDefault !== null ? inputValueWithDefault : 'null' }}</p>
</template>

<script setup lang="ts">
import { ref, unref, useTemplateRef } from 'vue'

const inputValueForClearing = ref<string>('clear me')
const inputValueWithDefault = ref<string | null>(null)

const inputForFocusRef = useTemplateRef('inputForFocusRef')
const focus = () => {
  unref(inputForFocusRef)?.focus()
}
const inputForFocusSelectRef = useTemplateRef('inputForFocusSelectRef')
const focusAndSelect = () => {
  unref(inputForFocusSelectRef)?.focus()
}
</script>
