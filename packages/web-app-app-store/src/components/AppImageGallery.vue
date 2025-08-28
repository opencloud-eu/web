<template>
  <div class="app-image-wrapper">
    <div
      v-if="app.badge"
      class="app-image-ribbon text-right size-[7rem] overflow-hidden"
      :class="[`app-image-ribbon-${app.badge.color}`]"
    >
      <span class="text-xs font-bold text-center leading-6 w-[10rem]" :class="ribbonColorClasses">{{
        app.badge.label
      }}</span>
    </div>
    <div class="app-image w-full">
      <oc-image v-if="currentImage?.url" :src="currentImage?.url" class="w-full max-w-full" />
      <div v-else class="fallback-icon bg-white flex items-center justify-center w-full">
        <oc-icon name="computer" size="xxlarge" />
      </div>
    </div>
    <ul
      v-if="hasPagination"
      class="app-image-navigation bg-white/80 flex justify-center items-center flex-row m-0 py-2 w-full"
    >
      <li>
        <oc-button data-testid="prev-image" class="p-1" appearance="raw" @click="previousImage">
          <oc-icon name="arrow-left-s" />
        </oc-button>
      </li>
      <li v-for="(image, index) in images" :key="`gallery-page-${index}`">
        <oc-button
          data-testid="set-image"
          class="p-2"
          appearance="raw"
          @click="setImageIndex(index)"
        >
          <oc-icon
            name="circle"
            size="small"
            :fill-type="index === currentImageIndex ? 'fill' : 'line'"
          />
        </oc-button>
      </li>
      <li>
        <oc-button data-testid="next-image" class="p-1" appearance="raw" @click="nextImage">
          <oc-icon name="arrow-right-s" />
        </oc-button>
      </li>
    </ul>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, PropType, ref, unref } from 'vue'
import { App, AppImage } from '../types'

export default defineComponent({
  name: 'AppImageGallery',
  props: {
    app: {
      type: Object as PropType<App>,
      required: true,
      default: (): App => undefined
    },
    showPagination: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  setup(props) {
    const images = computed(() => {
      return [props.app.coverImage, ...props.app.screenshots]
    })

    const currentImageIndex = ref<number>(0)
    const currentImage = computed<AppImage>(() => unref(images)[unref(currentImageIndex)])
    const hasPagination = computed(() => props.showPagination && unref(images).length > 1)
    const nextImage = () => {
      currentImageIndex.value = (unref(currentImageIndex) + 1) % unref(images).length
    }
    const previousImage = () => {
      currentImageIndex.value =
        (unref(currentImageIndex) - 1 + unref(images).length) % unref(images).length
    }
    const setImageIndex = (index: number) => {
      currentImageIndex.value = index
    }

    const ribbonColorClasses = computed(() => {
      switch (props.app.badge?.color) {
        case 'primary':
          return ['bg-role-primary', 'text-role-on-primary']
        case 'danger':
          return ['bg-role-error', 'text-role-on-error']
        default:
          return ['bg-role-primary', 'text-role-on-primary']
      }
    })

    return {
      currentImage,
      currentImageIndex,
      images,
      hasPagination,
      ribbonColorClasses,
      nextImage,
      previousImage,
      setImageIndex
    }
  }
})
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .app-image-ribbon span {
    @apply block;
  }
}
</style>

<style lang="scss">
.app-image-wrapper {
  position: relative;

  .app-image-ribbon {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;

    span {
      position: absolute;
      top: 1.8rem;
      right: -2.2rem;
      transform: rotate(45deg);
      -webkit-transform: rotate(45deg);
    }
  }

  .app-image {
    img {
      aspect-ratio: 3/2;
      object-fit: cover;
    }

    .fallback-icon {
      aspect-ratio: 3/2;
    }
  }

  .app-image-navigation {
    list-style: none;
    position: absolute;
    bottom: 0;
  }
}
</style>
