import { FileAction } from '../types'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useFileActions } from './useFileActions'

export const useFileActionsOpenWithDefault = () => {
  const { $gettext } = useGettext()

  const { getDefaultAction } = useFileActions()

  const actions = computed((): FileAction[] => [
    {
      name: 'open',
      icon: 'eye',
      label: () => $gettext('Open'),
      handler: (options) => {
        const defaultAction = getDefaultAction({ ...options, omitSystemActions: true })
        if (!defaultAction || !Object.hasOwn(defaultAction, 'handler')) {
          return
        }
        defaultAction.handler(options)
      },
      route: (options) => {
        const defaultAction = getDefaultAction({ ...options, omitSystemActions: true })
        return defaultAction!.route(options)
      },
      isVisible: (options) => {
        const defaultAction = getDefaultAction({ ...options, omitSystemActions: true })
        if (!defaultAction) {
          return false
        }
        return defaultAction.isVisible(options)
      },
      class: 'oc-files-actions-default-editor-trigger'
    }
  ])

  return {
    actions
  }
}
