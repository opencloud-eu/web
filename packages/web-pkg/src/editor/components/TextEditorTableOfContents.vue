<template>
  <div class="text-editor-table-of-contents sticky top-0 z-10 h-0 self-end">
    <nav
      class="absolute top-4 right-4 flex max-h-[60vh] flex-col rounded-md border border-role-border bg-role-surface shadow-lg"
      :class="{ 'w-64': !collapsed }"
      :aria-label="$gettext('Table of contents')"
    >
      <oc-button
        appearance="raw"
        justify-content="space-between"
        no-hover
        class="text-editor-table-of-contents-toggle gap-2 p-2"
        :aria-expanded="!collapsed"
        :aria-label="
          collapsed ? $gettext('Show table of contents') : $gettext('Hide table of contents')
        "
        @click="collapsed = !collapsed"
      >
        <span class="flex items-center gap-2">
          <oc-icon name="file-list-2" fill-type="line" size-class="size-4" />
          <span v-if="!collapsed" class="text-sm font-semibold" v-text="$gettext('Outlines')" />
        </span>
        <oc-icon v-if="!collapsed" name="arrow-up-s" fill-type="line" size-class="size-4" />
      </oc-button>
      <template v-if="!collapsed">
        <ul v-if="items.length" class="m-0 list-none overflow-y-auto px-1 pb-2">
          <li v-for="item in items" :key="item.id">
            <oc-button
              appearance="raw"
              justify-content="left"
              class="text-editor-table-of-contents-item w-full rounded-sm py-1 pr-2 text-sm hover:bg-role-surface-container-highest"
              :class="{
                'font-bold bg-role-secondary-container text-role-on-secondary-container':
                  item.id === activeId
              }"
              :style="{ paddingLeft: `${0.5 + (item.level - 1) * 0.75}rem` }"
              :title="item.textContent"
              :aria-current="item.id === activeId ? 'location' : undefined"
              @click="scrollToHeading(item)"
            >
              <span class="truncate" v-text="item.textContent" />
            </oc-button>
          </li>
        </ul>
        <p
          v-else
          class="text-editor-table-of-contents-empty m-0 px-2 pb-2 text-sm text-role-on-surface-variant"
          v-text="$gettext('Start editing your document to see the outline.')"
        />
      </template>
    </nav>
  </div>
</template>

<script setup lang="ts">
/**
 * The outline sits in a zero-height sticky rail along the right edge of the
 * scroll container, so it stays in the upper right while the content scrolls
 * underneath and takes no room in the flow.
 */
import { computed, ref, unref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { TableOfContentDataItem } from '@tiptap/extension-table-of-contents'
import { useGettext } from 'vue3-gettext'
import type { TextEditorInstance } from '../types'

const { editor, scrollContainer = null } = defineProps<{
  editor: TextEditorInstance
  scrollContainer?: HTMLElement | null
}>()

const { $gettext } = useGettext()

const collapsed = ref(true)
const activeId = ref<string | null>(null)

const items = computed(() => unref(editor.state.tableOfContents) ?? [])

/**
 * The active heading is the last one whose top has scrolled past the top of
 * the container, or the first heading while none has yet.
 */
function updateActiveId() {
  const headings = unref(items)
  if (!headings.length || !scrollContainer) {
    activeId.value = null
    return
  }

  // A little slack, so a heading just scrolled to counts as reached.
  const threshold = scrollContainer.getBoundingClientRect().top + 24
  const reached = headings.filter(({ dom }) => dom.getBoundingClientRect().top <= threshold)
  activeId.value = (reached.at(-1) ?? headings[0]).id
}

function scrollToHeading(item: TableOfContentDataItem) {
  item.dom.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeId.value = item.id
}

useEventListener(() => scrollContainer, 'scroll', updateActiveId, { passive: true })
watch([items, () => scrollContainer], updateActiveId, { immediate: true })
</script>
