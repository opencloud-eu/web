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
<script lang="ts">
import { CachedFile } from '../../helpers/types'
import {
  defineComponent,
  PropType,
  ref,
  watch,
  unref,
  nextTick,
  onMounted,
  onBeforeUnmount
} from 'vue'
import type { PanzoomObject, PanzoomOptions } from '@panzoom/panzoom'
import Panzoom from '@panzoom/panzoom'
import { useEventBus } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'MediaImage',
  props: {
    file: {
      type: Object as PropType<CachedFile>,
      required: true
    },
    currentImageRotation: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const eventBus = useEventBus()

    const img = ref<HTMLElement | null>()
    const panzoom = ref<PanzoomObject>()
    const resetEventToken = ref(null)
    const zoomToken = ref(null)
    const shrinkToken = ref(null)

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

      switch (props.currentImageRotation) {
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
        `rotate(${props.currentImageRotation}deg) scale(${scale}) translate(${h}px, ${v}px)`
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
        maxScale: 10,
        minScale: 0.5,
        setTransform: (_, { scale, x, y }) => setTransform({ scale, x, y })
      } as PanzoomOptions)
      ;(unref(img) as unknown as HTMLElement).addEventListener('wheel', onWheelEvent)
    }

    watch(() => props.file, initPanzoom, { immediate: true, deep: true })

    watch(
      () => props.currentImageRotation,
      () => {
        setTransform({
          scale: unref(panzoom).getScale(),
          x: unref(panzoom).getPan().x,
          y: unref(panzoom).getPan().y
        })
      }
    )

    onMounted(() => {
      resetEventToken.value = eventBus.subscribe('app.preview.media.image.reset', () =>
        initPanzoom()
      )
      zoomToken.value = eventBus.subscribe('app.preview.media.image.zoom', () =>
        unref(panzoom)?.zoomIn({ step: 0.1 })
      )
      shrinkToken.value = eventBus.subscribe('app.preview.media.image.shrink', () =>
        unref(panzoom)?.zoomOut({ step: 0.1 })
      )
    })

    onBeforeUnmount(() => {
      eventBus.unsubscribe('app.preview.media.image.reset', unref(resetEventToken))
      eventBus.unsubscribe('app.preview.media.image.zoom', unref(zoomToken))
      eventBus.unsubscribe('app.preview.media.image.shrink', unref(shrinkToken))
    })

    return {
      img
    }
  }
})
</script>
