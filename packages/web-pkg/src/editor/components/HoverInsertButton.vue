<template>
  <oc-button
    ref="buttonRef"
    type="button"
    appearance="raw"
    :style="{
      position: 'fixed',
      top: `${position.top}px`,
      left: `${position.left}px`,
      opacity: visible ? '1' : '0',
      visibility: visible ? 'visible' : 'hidden'
    }"
    aria-label="Insert block"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @click="onClick"
  >
    <oc-icon name="add" fill-type="line" size="medium" class="opacity-40" />
  </oc-button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { OcButton, OcIcon } from '@opencloud-eu/design-system/components'

interface Position {
  top: number
  left: number
}

const buttonRef = ref<InstanceType<typeof OcButton>>()
const visible = ref(false)
const position = ref<Position>({ top: 0, left: 0 })

const emit = defineEmits<{
  click: []
  mouseenter: []
  mouseleave: []
}>()

function updatePosition(pos: Position) {
  position.value = pos
}

function show() {
  visible.value = true
}

function hide() {
  visible.value = false
}

function onMouseEnter() {
  emit('mouseenter')
}

function onMouseLeave() {
  emit('mouseleave')
}

function onClick() {
  emit('click')
}

defineExpose({
  updatePosition,
  show,
  hide
})
</script>
