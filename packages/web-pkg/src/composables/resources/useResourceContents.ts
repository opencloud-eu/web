import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { useResourcesStore } from '../piniaStores'
import { useRouter } from '../router'
import { isLocationSharesActive } from '../../router'
import { formatFileSize } from '../../helpers'
import { Resource } from '@opencloud-eu/web-client'

export const useResourceContents = ({
  showSizeInformation = true,
  isHidden
}: {
  showSizeInformation?: boolean
  // overrides which resources count as hidden, the store only checks their names
  isHidden?: (resource: Resource) => boolean
} = {}) => {
  const resourcesStore = useResourcesStore()
  const { current: currentLanguage, $gettext, $ngettext } = useGettext()
  const router = useRouter()

  const {
    resources,
    totalResourcesCount: storeResourcesCount,
    areHiddenFilesShown
  } = storeToRefs(resourcesStore)

  const totalResourcesCount = computed(() => {
    if (!isHidden) {
      return unref(storeResourcesCount)
    }
    const hiddenResources = unref(resources).filter(isHidden)
    return {
      ...unref(storeResourcesCount),
      hiddenFiles: hiddenResources.filter(({ type }) => type === 'file').length,
      hiddenFolders: hiddenResources.filter(({ type }) => type === 'folder').length
    }
  })

  const itemSize = computed(() => {
    const accumulatedSize = unref(resources)
      .map((r) => (r.size ? parseInt(r.size.toString()) : 0))
      .reduce((x, y) => x + y, 0)
    return formatFileSize(accumulatedSize, currentLanguage)
  })

  const resourceContentsText = computed(() => {
    let filesStr = $ngettext(
      '%{ filesCount } file',
      '%{ filesCount } files',
      unref(totalResourcesCount).files,
      {
        filesCount: unref(totalResourcesCount).files.toString()
      }
    )

    if (!unref(areHiddenFilesShown) && unref(totalResourcesCount).hiddenFiles) {
      filesStr = $ngettext(
        '%{ filesCount } file including %{ filesHiddenCount } hidden',
        '%{ filesCount } files including %{ filesHiddenCount } hidden',
        unref(totalResourcesCount).files,
        {
          filesCount: unref(totalResourcesCount).files.toString(),
          filesHiddenCount: unref(totalResourcesCount).hiddenFiles.toString()
        }
      )
    }

    let foldersStr = $ngettext(
      '%{ foldersCount } folder',
      '%{ foldersCount } folders',
      unref(totalResourcesCount).folders,
      {
        foldersCount: unref(totalResourcesCount).folders.toString()
      }
    )

    if (!unref(areHiddenFilesShown) && unref(totalResourcesCount).hiddenFolders) {
      foldersStr = $ngettext(
        '%{ foldersCount } folder including %{ foldersHiddenCount } hidden',
        '%{ foldersCount } folders including %{ foldersHiddenCount } hidden',
        unref(totalResourcesCount).folders,
        {
          foldersCount: unref(totalResourcesCount).folders.toString(),
          foldersHiddenCount: unref(totalResourcesCount).hiddenFolders.toString()
        }
      )
    }

    const spacesStr = $ngettext(
      '%{ spacesCount } space',
      '%{ spacesCount } spaces',
      unref(totalResourcesCount).spaces,
      {
        spacesCount: unref(totalResourcesCount).spaces.toString()
      }
    )

    const totalItemsCount =
      unref(totalResourcesCount).files +
      unref(totalResourcesCount).folders +
      unref(totalResourcesCount).spaces
    const showSize = showSizeInformation && parseFloat(unref(itemSize)) > 0
    const showSpaces = isLocationSharesActive(router, 'files-shares-via-link')

    const itemTemplate = showSize
      ? $gettext('%{ itemsCount } item with %{ itemSize } in total')
      : $gettext('%{ itemsCount } item in total')

    const pluralTemplate = showSize
      ? $gettext('%{ itemsCount } items with %{ itemSize } in total')
      : $gettext('%{ itemsCount } items in total')

    const detailsTemplate = showSpaces
      ? '(%{ filesStr}, %{ foldersStr}, %{ spacesStr})'
      : '(%{ filesStr}, %{ foldersStr})'

    const singleTemplate = `${itemTemplate} ${detailsTemplate}`
    const pluralizedTemplate = `${pluralTemplate} ${detailsTemplate}`

    return $ngettext(singleTemplate, pluralizedTemplate, totalItemsCount, {
      itemsCount: totalItemsCount.toString(),
      itemSize: unref(itemSize),
      filesStr,
      foldersStr,
      spacesStr
    })
  })

  return {
    resourceContentsText
  }
}
