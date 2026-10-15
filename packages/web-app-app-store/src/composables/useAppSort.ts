import { computed, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SortField, useSort } from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { App, AppVersion } from '../types'

// newest and oldest compare when an app was first released; apps without any release date count as oldest
function getFirstReleaseTime(versions: AppVersion[]) {
  const times = versions
    .filter(({ releaseDate }) => releaseDate)
    .map(({ releaseDate }) => new Date(releaseDate).valueOf())
  return times.length ? Math.min(...times) : 0
}

export function useAppSort(apps: Ref<App[]>) {
  const { $gettext } = useGettext()

  const sortFields = computed<SortField[]>(() => [
    { label: $gettext('A-Z'), name: 'name', sortable: true, sortDir: SortDir.Asc },
    { label: $gettext('Z-A'), name: 'name', sortable: true, sortDir: SortDir.Desc },
    {
      label: $gettext('Newest'),
      name: 'release',
      prop: 'versions',
      sortable: getFirstReleaseTime,
      sortDir: SortDir.Desc
    },
    {
      label: $gettext('Oldest'),
      name: 'release',
      prop: 'versions',
      sortable: getFirstReleaseTime,
      sortDir: SortDir.Asc
    }
  ])

  const {
    items: sortedApps,
    sortBy,
    sortDir,
    handleSort
  } = useSort({ items: apps, fields: sortFields, foldersFirst: false })

  const currentSortField = computed(() => {
    return (
      unref(sortFields).find(
        (field) => field.name === unref(sortBy) && unref(field.sortDir) === unref(sortDir)
      ) || unref(sortFields)[0]
    )
  })

  function setSortField(field: SortField) {
    return handleSort({ sortBy: field.name, sortDir: unref(field.sortDir) })
  }

  return { sortFields, sortedApps, currentSortField, setSortField }
}
