import { IconFillType } from '@opencloud-eu/web-pkg'

export type ExtensionStatus = 'active' | 'incompatible' | 'failed'

export interface ExtensionInfo {
  name: string
  icon?: string
  iconFillType?: IconFillType
  version?: string
  minOpenCloud?: string
  maxOpenCloud?: string
  status: ExtensionStatus
  loaded: boolean
}
