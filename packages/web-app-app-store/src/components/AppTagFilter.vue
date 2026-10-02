<template>
  <div ref="container" class="app-tag-filter flex flex-wrap gap-2 w-full">
    <oc-tag
      data-testid="tag-filter-all"
      type="button"
      rounded
      class="whitespace-nowrap cursor-pointer"
      :appearance="!activeTag ? 'filled' : 'outline'"
      :aria-pressed="!activeTag"
      @click="emit('select', '')"
    >
      {{ $gettext('All') }} ({{ apps.length }})
    </oc-tag>
    <oc-tag
      v-for="tag in visibleTags"
      :key="`app-tag-filter-${tag.name}`"
      data-testid="tag-filter-button"
      type="button"
      rounded
      class="whitespace-nowrap cursor-pointer"
      :appearance="isActive(tag.name) ? 'filled' : 'outline'"
      :aria-pressed="isActive(tag.name)"
      @click="toggleTag(tag.name)"
    >
      {{ tag.name }} ({{ tag.count }})
    </oc-tag>
    <template v-if="hiddenTags.length">
      <oc-tag
        :id="toggleId"
        data-testid="tag-filter-more"
        type="button"
        rounded
        class="whitespace-nowrap cursor-pointer"
        :appearance="hiddenTags.some((tag) => isActive(tag.name)) ? 'filled' : 'outline'"
      >
        {{ $gettext('Additional tags') }} ({{ hiddenTags.length }})
        <oc-icon name="arrow-down-s" size-class="size-4" />
      </oc-tag>
      <oc-drop
        :toggle="`#${toggleId}`"
        :title="$gettext('Additional tags')"
        :is-menu="false"
        close-on-click
        padding-size="small"
      >
        <div class="flex flex-wrap gap-2">
          <oc-tag
            v-for="tag in hiddenTags"
            :key="`app-tag-filter-hidden-${tag.name}`"
            data-testid="tag-filter-hidden-button"
            type="button"
            rounded
            class="whitespace-nowrap cursor-pointer"
            :appearance="isActive(tag.name) ? 'filled' : 'outline'"
            :aria-pressed="isActive(tag.name)"
            @click="toggleTag(tag.name)"
          >
            {{ tag.name }} ({{ tag.count }})
          </oc-tag>
        </div>
      </oc-drop>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import { uniqueId } from 'lodash-es'
import { App } from '../types'

const MAX_ROWS = 1

const { apps, activeTag = '' } = defineProps<{
  apps: App[]
  activeTag?: string
}>()

const emit = defineEmits<{
  (e: 'select', tag: string): void
}>()

const container = useTemplateRef<HTMLElement>('container')
const toggleId = uniqueId('app-tag-filter-more-')

const tags = computed(() => {
  const counts = new Map<string, number>()
  for (const app of apps) {
    for (const tag of new Set(app.tags)) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
})

const visibleCount = ref<number>(Infinity)
const visibleTags = computed(() => unref(tags).slice(0, unref(visibleCount)))
const hiddenTags = computed(() => unref(tags).slice(unref(visibleCount)))

function isActive(tag: string) {
  return tag.toLowerCase() === activeTag.toLowerCase()
}

function toggleTag(tag: string) {
  emit('select', isActive(tag) ? '' : tag)
}

function getTagElements() {
  return Array.from(unref(container).querySelectorAll<HTMLElement>(':scope > .oc-tag'))
}

function getRowTops() {
  return [...new Set(getTagElements().map((el) => el.offsetTop))]
}

async function updateVisibleCount() {
  if (!unref(container)) {
    return
  }

  visibleCount.value = Infinity
  await nextTick()
  const rowTops = getRowTops()
  if (rowTops.length <= MAX_ROWS) {
    return
  }

  // first guess: everything that fits into the allowed rows, then make room for the toggle
  const firstOverflowIndex = getTagElements().findIndex(
    (el) => el.offsetTop > rowTops[MAX_ROWS - 1]
  )
  // the first element is the "All" tag, which is not part of the tags list
  visibleCount.value = Math.max(firstOverflowIndex - 1, 0)
  await nextTick()
  while (getRowTops().length > MAX_ROWS && unref(visibleCount) > 0) {
    visibleCount.value--
    await nextTick()
  }
}

let resizeObserver: ResizeObserver
let lastWidth = 0
onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === lastWidth) {
      return
    }
    lastWidth = entry.contentRect.width
    updateVisibleCount()
  })
  resizeObserver.observe(unref(container))
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch(tags, updateVisibleCount)
</script>
