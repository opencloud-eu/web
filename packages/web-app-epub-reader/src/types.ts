/** A flattened table of contents entry. */
export type Chapter = {
  id: string
  href: string
  label: string
  /** Nesting level in the table of contents, 0 for top level entries. */
  depth: number
}
