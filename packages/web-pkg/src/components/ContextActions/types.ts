import { Action } from '../../composables'
import type { Icon } from '@opencloud-eu/design-system/helpers'

export type MenuSectionDrop = {
  label: string
  name: string
  icon: Icon
  items?: Action[]
  /**
   * Optional grouping of the items, groups are separated by a divider.
   */
  itemGroups?: Action[][]
  emptyMessage?: string
}

export type MenuSection = {
  name: string
  items?: Action[]
  dropItems?: MenuSectionDrop[]
}
