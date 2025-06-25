import { Action } from '../../composables'

export type MenuSectionDrop = {
  label: string
  name: string
  icon: string
  items?: Action[]
  emptyMessage?: string
}

export type MenuSection = {
  name: string
  items?: Action[]
  dropItems?: MenuSectionDrop[]
}
