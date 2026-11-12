export abstract class PaginationConstants {
  static readonly perPageDefault: string = '100'
  static readonly perPageQueryName: string = 'items-per-page'
  static readonly options = ['20', '50', '100', '250', '500']
  /**
   * Selecting this option switches the file views from numbered pagination to
   * infinite scrolling: all items are rendered cumulatively while the user is
   * approaching the end of the list, no further numbering is needed.
   *
   * The symbol doubles as the persisted route query and local storage value,
   * which means it does not need to be translated.
   */
  static readonly infiniteScrollValue: string = '∞'
  static readonly optionsWithInfiniteScroll: Array<string> = [
    ...PaginationConstants.options,
    PaginationConstants.infiniteScrollValue
  ]
  /**
   * Amount of items the list grows by per step in infinite scroll mode.
   * (Equals the default amount of items per page.)
   */
  static readonly infiniteScrollChunk: number = Number(PaginationConstants.perPageDefault)
  /**
   * The scroll sentinel can still sit inside the look-ahead zone right after an
   * append. Cap consecutive appends in that case and wait for the user to scroll
   * (and the sentinel to leave and re-enter the look-ahead zone) again.
   */
  static readonly infiniteScrollAppendCap: number = 3
}
