import 'epubjs'

declare module 'epubjs' {
  export interface RenditionContent {
    document: Document
  }

  export interface Rendition {
    annotations?: {
      remove?: (cfi: string, type: string) => void
      highlight?: (
        cfi: string,
        data: unknown,
        callback: unknown,
        className: string,
        styles: Record<string, string>
      ) => void
      add?: (
        type: string,
        cfi: string,
        data: unknown,
        callback: unknown,
        className: string,
        styles: Record<string, string>
      ) => void
    }
    getContents?: () => RenditionContent[]
    getRange?: (cfi: string) => Range | null
  }
}
