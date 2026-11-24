export abstract class PaginationConstants {
  static readonly perPageDefault: string = '100'
  static readonly options = ['20', '50', '100', '250', '500']
  /**
   * Selecting this option switches the file views from numbered pagination to
   * infinite scrolling: all items are rendered cumulatively while the user is
   * approaching the end of the list, no further numbering is needed.
   *
   * The symbol is used as the option label and selection value, so it does not
   * need to be translated.
   */
  static readonly infiniteScrollValue: string = '∞'
  static readonly infiniteScrollStorageKey: string = 'oc-options_files-infinite-scroll'
  static readonly optionsWithInfiniteScroll: Array<string> = [
    ...PaginationConstants.options,
    PaginationConstants.infiniteScrollValue
  ]
  /**
   * Amount of items the list grows by per step in infinite scroll mode.
   * (Equals the default amount of items per page.)
   */
  static readonly infiniteScrollChunk: number = Number(PaginationConstants.perPageDefault)
}
