import { eventBus } from '../../services/eventBus'
import { RouteLocation } from 'vue-router'
import omit from 'lodash-es/omit'
import { BreadcrumbItem } from '@opencloud-eu/design-system/helpers'
import { v4 as uuidV4 } from 'uuid'
import { urlJoin } from '@opencloud-eu/web-client'
import { Ref, ref, unref } from 'vue'
import { AncestorMetaData } from '../../types'

export const useBreadcrumbsFromPath = () => {
  const breadcrumbsFromPath = ({
    route,
    resourcePath,
    ancestorMetaData = ref({})
  }: {
    route: RouteLocation
    resourcePath: string
    ancestorMetaData?: Ref<AncestorMetaData>
  }): BreadcrumbItem[] => {
    const pathSplit = (p = '') => p.split('/').filter(Boolean)
    const current = pathSplit(route.path)
    const resource = pathSplit(resourcePath)

    return resource.map((text, i) => {
      const relativePath = urlJoin(...resource.slice(0, i + 1), { leadingSlash: true })

      // use ancestor to retrieve fileId
      const ancestor = unref(ancestorMetaData)[relativePath]

      return {
        id: uuidV4(),
        allowContextActions: true,
        text,
        to: {
          path: '/' + [...current].splice(0, current.length - resource.length + i + 1).join('/'),
          query: {
            ...omit(route.query, 'page', 'fileId'),
            ...(ancestor && { fileId: ancestor.id })
          }
        },
        isStaticNav: false
      } as BreadcrumbItem
    })
  }

  const concatBreadcrumbs = (...items: BreadcrumbItem[]): BreadcrumbItem[] => {
    const last = items.pop()

    return [
      ...items,
      {
        id: uuidV4(),
        allowContextActions: last.allowContextActions,
        text: last.text,
        onClick: () => eventBus.publish('app.files.list.load'),
        isTruncationPlaceholder: last.isTruncationPlaceholder,
        isStaticNav: last.isStaticNav
      }
    ]
  }

  return { breadcrumbsFromPath, concatBreadcrumbs }
}
