import { Action } from '../../composables'

export type MenuSectionDrop = {
  label: string
  name: string
  icon: string
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
