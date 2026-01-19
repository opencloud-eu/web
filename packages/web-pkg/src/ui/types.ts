import { IconFillType } from '../helpers/resource'
import { Component } from 'vue'

export type FolderView = {
  name: string
  label: string
  icon: {
    name: string
    fillType: IconFillType
  }
  component: Component
  componentAttrs?: () => Record<string, unknown>
}
