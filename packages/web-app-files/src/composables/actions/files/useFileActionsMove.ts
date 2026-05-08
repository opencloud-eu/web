import { Resource } from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import {
  ActionOptions,
  canBeMoved,
  FileAction,
  isLocationCommonActive,
  isLocationPublicActive,
  isLocationSpacesActive,
  isMacOs,
  useClipboardStore,
  useResourcesStore,
  useRouter
} from '@opencloud-eu/web-pkg'

export const useFileActionsMove = () => {
  const router = useRouter()
  const { cutResources } = useClipboardStore()
  const language = useGettext()
  const { $gettext } = language

  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)

  const cutShortcutString = computed(() => {
    if (isMacOs()) {
      return $gettext('⌘ + X')
    }
    return $gettext('Ctrl + X')
  })

  const handler = ({ resources }: ActionOptions) => {
    cutResources(resources as Resource[])
  }
  const actions = computed((): FileAction[] => [
    {
      name: 'cut',
      icon: 'scissors',
      handler,
      shortcut: unref(cutShortcutString),
      label: () => $gettext('Cut'),
      isVisible: ({ resources }) => {
        if (
          !isLocationSpacesActive(router, 'files-spaces-generic') &&
          !isLocationPublicActive(router, 'files-public-link') &&
          !isLocationCommonActive(router, 'files-common-favorites')
        ) {
          return false
        }
        if (resources.length === 0) {
          return false
        }

        if (!unref(currentFolder)) {
          return false
        }

        if (resources.length === 1 && resources[0].locked) {
          return false
        }

        const moveDisabled = resources.some((resource) => {
          return canBeMoved(resource, unref(currentFolder).path) === false
        })
        return !moveDisabled
      },
      class: 'oc-files-actions-move-trigger'
    }
  ])

  return {
    actions
  }
}
