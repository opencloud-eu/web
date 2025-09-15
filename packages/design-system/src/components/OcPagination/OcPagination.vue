<template>
  <nav class="oc-pagination" :aria-label="$gettext('Pagination')">
    <ol class="oc-pagination-list flex items-center flex-wrap m-0 gap-2">
      <li v-if="isPrevPageAvailable" class="oc-pagination-list-item">
        <router-link
          class="oc-pagination-list-item-prev flex mr-2 rounded-sm hover:bg-role-secondary hover:text-role-on-secondary [&_svg]:hover:!fill-role-on-secondary"
          :aria-label="$gettext('Go to the previous page')"
          :to="previousPageLink"
        >
          <oc-icon name="arrow-drop-left" fill-type="line" color="var(--oc-role-on-surface)" />
        </router-link>
      </li>
      <li v-for="(page, index) in displayedPages" :key="index" class="oc-pagination-list-item">
        <component
          :is="pageComponent(page)"
          class="oc-pagination-list-item-page py-1 px-2 rounded-sm hover:bg-role-secondary hover:text-role-on-secondary transition-colors duration-200 ease-in-out"
          :class="pageClass(page)"
          v-bind="bindPageProps(page)"
        >
          {{ page }}
        </component>
      </li>
      <li v-if="isNextPageAvailable" class="oc-pagination-list-item">
        <router-link
          class="oc-pagination-list-item-next flex ml-2 rounded-sm hover:bg-role-secondary [&_svg]:hover:!fill-role-on-secondary"
          :aria-label="$gettext('Go to the next page')"
          :to="nextPageLink"
        >
          <oc-icon name="arrow-drop-right" fill-type="line" color="var(--oc-role-on-surface)" />
        </router-link>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import { useGettext } from 'vue3-gettext'
import { RouteLocation } from 'vue-router'

type Page = string | number

export interface Props {
  /**
   * @docs The current page number.
   */
  currentPage: number
  /**
   * @docs The current route object.
   */
  currentRoute: RouteLocation
  /**
   * @docs The total number of pages.
   */
  pages: number
  /**
   * @docs The maximum number of displayed pages.
   */
  maxDisplayed?: number
}

const { currentPage, currentRoute, pages, maxDisplayed } = defineProps<Props>()

const { $gettext } = useGettext()

const displayedPages = computed(() => {
  let pagesCollection: Array<Page> = []

  for (let i = 0; i < pages; i++) {
    pagesCollection.push(i + 1)
  }

  if (maxDisplayed && maxDisplayed + 1 < pages) {
    const currentPageIndex = unref($_currentPage) - 1
    const indentation = Math.floor(maxDisplayed / 2)

    pagesCollection = pagesCollection.slice(
      Math.max(0, currentPageIndex - indentation),
      currentPageIndex + indentation + 1
    )

    if (unref($_currentPage) > 2) {
      Number(pagesCollection[0]) > 2
        ? pagesCollection.unshift(1, '...')
        : pagesCollection.unshift(1)
    }

    if (unref($_currentPage) < pages - 1) {
      Number(pagesCollection[pagesCollection.length - 1]) < pages - 1
        ? pagesCollection.push('...', pages)
        : pagesCollection.push(pages)
    }

    return pagesCollection
  }

  return pagesCollection
})

const isPrevPageAvailable = computed(() => unref($_currentPage) > 1)
const isNextPageAvailable = computed(() => unref($_currentPage) < pages)
const previousPageLink = computed(() => bindPageLink(unref($_currentPage) - 1))
const nextPageLink = computed(() => bindPageLink(unref($_currentPage) + 1))
const $_currentPage = computed(() => Math.max(1, Math.min(currentPage, pages)))

const pageLabel = (page: Page) => {
  return $gettext('Go to page %{ page }', { page: page.toString() })
}

const isCurrentPage = (page: Page) => {
  return unref($_currentPage) === page
}

const pageComponent = (page: Page) => {
  return page === '...' || isCurrentPage(page) ? 'span' : 'router-link'
}

const bindPageProps = (page: Page) => {
  if (page === '...') {
    return
  }

  if (isCurrentPage(page)) {
    return {
      'aria-current': 'page'
    }
  }

  const link = bindPageLink(page)

  return {
    'aria-label': pageLabel(page),
    to: link
  }
}

const pageClass = (page: Page) => {
  const classes = []

  if (isCurrentPage(page)) {
    classes.push(
      ...[
        'oc-pagination-list-item-current',
        'font-bold',
        'bg-role-secondary',
        'text-role-on-secondary'
      ]
    )
  } else if (page === '...') {
    classes.push('oc-pagination-list-item-ellipsis')
  } else {
    classes.push('oc-pagination-list-item-link')
  }

  return classes
}

const bindPageLink = (page: Page) => {
  return {
    name: currentRoute.name,
    query: { ...currentRoute.query, page },
    params: currentRoute.params
  }
}
</script>
