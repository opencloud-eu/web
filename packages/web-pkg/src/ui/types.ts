import { IconFillType } from '../helpers/resource'
import { Component } from 'vue'

export type FolderView = {
  name: string
  label: string
  icon: {
    name: string
    fillType: IconFillType
  }
  /** @deprecated style your view with proper CSS instead */
  isScrollable?: boolean
  component: Component
  componentAttrs?: () => Record<string, unknown>
}
