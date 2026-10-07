import type { Icon } from '@opencloud-eu/design-system/helpers'
import { Component } from 'vue'

export type FolderView = {
  name: string
  label: string
  icon: Icon
  component: Component
  componentAttrs?: () => Record<string, unknown>
}
