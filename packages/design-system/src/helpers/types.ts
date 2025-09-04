import { RouteLocationRaw } from 'vue-router'

export interface ContextualHelperDataListItem {
  text: string
  headline?: boolean
}

export interface ContextualHelperData {
  title: string
  text?: string
  list?: ContextualHelperDataListItem[]
  readMoreLink?: string
}

export interface ContextualHelper {
  isEnabled: boolean
  data: ContextualHelperData
}

export interface PasswordPolicyRule {
  code: string
  message: string
  helperMessage?: string
  format: (number | string)[]
  verified: boolean
}

export interface PasswordPolicy {
  rules: unknown[]

  check(password: string): boolean

  missing(password: string): {
    rules: PasswordPolicyRule[]
  }
}

// FIXME: ideally the id should not be optional, but some generated types (e.g. User and Group) need this
export type Item = {
  id?: string
}

export type FieldType = {
  name: string
  title?: string
  headerType?: string
  type?: string
  callback?: any
  alignH?: 'left' | 'center' | 'right'
  alignV?: 'top' | 'middle' | 'bottom'
  width?: 'auto' | 'shrink' | 'expand'
  wrap?: 'break' | 'nowrap' | 'truncate'
  thClass?: string
  tdClass?: string
  sortable?: boolean
  sortDir?: string
  prop?: string
  accessibleLabelCallback?: (item: Item) => string
}

export type Recipient = {
  name: string
  icon?: {
    name: string
    label: string
  }
}

export interface BreadcrumbItem {
  id?: string
  text: string
  to?: RouteLocationRaw
  allowContextActions?: boolean
  onClick?: () => void
  isTruncationPlaceholder?: boolean
  isStaticNav?: boolean
}

export type AppearanceType = 'filled' | 'outline' | 'raw' | 'raw-inverse'
export type FillType = 'fill' | 'line' | 'none'
export type SizeType = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge'
export type JustifyContentType =
  | 'left'
  | 'center'
  | 'right'
  | 'space-around'
  | 'space-between'
  | 'space-evenly'
