import type { Icon } from '@opencloud-eu/design-system/helpers'

export type ExtensionStatus = 'active' | 'incompatible' | 'failed'

export interface ExtensionInfo {
  name: string
  icon?: Icon
  version?: string
  minOpenCloud?: string
  maxOpenCloud?: string
  status: ExtensionStatus
  loaded: boolean
}
