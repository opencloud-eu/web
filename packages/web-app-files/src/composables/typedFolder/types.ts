export interface TypedFolderSchema {
  label: string
  icon?: string
  children: string[]
  columns?: string[]
  namePattern?: string
  actions?: string[]
  metadata?: Record<string, TypedFieldDef>
}

export interface TypedFieldDef {
  label: string
  type: 'string' | 'enum' | 'date' | 'number'
  values?: string[]
  auto?: boolean
}
