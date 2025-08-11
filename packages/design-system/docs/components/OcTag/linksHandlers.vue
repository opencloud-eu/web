<template>
  <oc-tag type="button" class="mr-2" @click="onClick">I am a button</oc-tag>
  <oc-tag type="router-link" :to="{ name: 'somePage' }">I am a link</oc-tag>
  <p>Button clicked: {{ buttonClicked }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const buttonClicked = ref(false)

const onClick = () => {
  buttonClicked.value = true
}
</script>
