<template>
  <img
    ref="img"
    :key="`media-image-${file.id}`"
    :src="file.url"
    :alt="file.name"
    :data-id="file.id"
    class="max-w-full max-h-full pt-4"
  />
</template>
<script setup lang="ts">
import { MediaFile } from '../../helpers/types'
import { ref, watch, unref, nextTick, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import type { PanzoomObject, PanzoomOptions } from '@panzoom/panzoom'
import Panzoom from '@panzoom/panzoom'
import { useEventBus } from '@opencloud-eu/web-pkg'

const { file, currentImageRotation } = defineProps<{
  file: MediaFile
  currentImageRotation: number
}>()

const eventBus = useEventBus()

const img = useTemplateRef('img')
const panzoom = ref<PanzoomObject>()

const onWheelEvent = (e: WheelEvent) => {
  e.preventDefault()
  if (!e.shiftKey) {
    return false
  }

  if (e.deltaY < 0) {
    unref(panzoom).zoomIn({ step: 0.1 })
  } else if (e.deltaY > 0) {
    unref(panzoom).zoomOut({ step: 0.1 })
  }
}

const setTransform = ({ scale, x, y }: { scale: number; x: number; y: number }) => {
  let h: number
  let v: number

  switch (currentImageRotation) {
    case -270:
    case 90:
      h = y
      v = 0 - x
      break
    case -180:
    case 180:
      h = 0 - x
      v = 0 - y
      break
    case -90:
    case 270:
      h = 0 - y
      v = x
      break
    default:
      h = x
      v = y
  }

  unref(panzoom).setStyle(
    'transform',
    `rotate(${currentImageRotation}deg) scale(${scale}) translate(${h}px, ${v}px)`
  )
}

const initPanzoom = async () => {
  if (unref(panzoom)) {
    await nextTick()
    ;(unref(img) as unknown as HTMLElement).removeEventListener('wheel', onWheelEvent)
    unref(panzoom)?.destroy()
  }

  // wait for next tick until image is rendered
  await nextTick()

  panzoom.value = Panzoom(unref(img), {
    animate: false,
    duration: 300,
    overflow: 'auto',
    minScale: 0.5,
    maxScale: 10,
    setTransform: (_, { scale, x, y }) => setTransform({ scale, x, y })
  } as PanzoomOptions)
  unref(img).addEventListener('wheel', onWheelEvent)
}

watch(() => file, initPanzoom, { immediate: true, deep: true })

watch(
  () => currentImageRotation,
  () => {
    if (!unref(panzoom)) {
      return
    }

    setTransform({
      scale: unref(panzoom).getScale(),
      x: unref(panzoom).getPan().x,
      y: unref(panzoom).getPan().y
    })
  }
)

let resetEventToken: string
let zoomToken: string
let shrinkToken: string

onMounted(() => {
  resetEventToken = eventBus.subscribe('app.preview.media.image.reset', () => initPanzoom())
  zoomToken = eventBus.subscribe('app.preview.media.image.zoom', () =>
    unref(panzoom)?.zoomIn({ step: 0.1 })
  )
  shrinkToken = eventBus.subscribe('app.preview.media.image.shrink', () =>
    unref(panzoom)?.zoomOut({ step: 0.1 })
  )
})

onBeforeUnmount(() => {
  eventBus.unsubscribe('app.preview.media.image.reset', resetEventToken)
  eventBus.unsubscribe('app.preview.media.image.zoom', zoomToken)
  eventBus.unsubscribe('app.preview.media.image.shrink', shrinkToken)
})
</script>
