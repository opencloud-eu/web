import { Editor, Extension as TipTapExtension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import { VueRenderer } from '@tiptap/vue-3'
import HoverInsertButton from '../components/HoverInsertButton.vue'
import SlashCommandMenu from '../components/SlashCommandMenu.vue'
import { filterSlashCommandItems, type FlatSlashCommandItem } from './slashCommands'
import type { EditorActionGroup } from '../composables'

interface HoverInsertMenuOptions {
  getGroups: () => EditorActionGroup[]
}

interface HoverInsertButtonRef {
  updatePosition: (position: { top: number; left: number }) => void
  show: () => void
  hide: () => void
}

interface BlockContext {
  blockDepth: number
  blockPos: number
  blockStart: number
}

const BUTTON_OFFSET = 36

class HoverInsertMenuView {
  private button: VueRenderer
  private menu: VueRenderer | null = null
  private activeBlock: Pick<BlockContext, 'blockPos' | 'blockDepth'> | null = null
  private lastDocSize = 0

  constructor(
    private view: EditorView,
    private editor: Editor,
    private options: HoverInsertMenuOptions
  ) {
    this.button = new VueRenderer(HoverInsertButton, { editor, props: {} })
    document.body.appendChild(this.button.el)
    this.button.el.addEventListener('click', this.onClick)
    document.addEventListener('mousemove', this.onMove)
    document.addEventListener('scroll', this.onScroll, true)
    this.lastDocSize = this.view.state.doc.content.size
  }

  update(): void {
    // The menu can be removed by outside interactions (e.g. escape/click-away),
    // so we keep local state in sync with the actual DOM.
    if (this.menu && !document.body.contains(this.menu.el)) this.closeMenu()

    // Hide button when user types (but not when menu is open)
    const currentDocSize = this.view.state.doc.content.size
    if (!this.menu && currentDocSize !== this.lastDocSize) this.hideButton()
    this.lastDocSize = currentDocSize
  }

  destroy(): void {
    document.removeEventListener('mousemove', this.onMove)
    document.removeEventListener('scroll', this.onScroll, true)
    this.button.destroy()
    this.closeMenu()
  }

  private onScroll = (): void => {
    this.hideButton()
  }

  private onMove = (e: MouseEvent): void => {
    const rect = this.view.dom.getBoundingClientRect()
    // Keep the button visible while moving from the block to the left-side button.
    // This check is based on the active block's vertical range, not pointer target.
    if (this.isHoveringActiveBlock(e, rect)) return

    const block = this.editor.isEditable && !this.menu ? this.getHoveredBlock(e) : null
    if (!block) return this.hideButton()

    this.showButtonForBlock(block, rect.left)
  }

  private onClick = (): void => {
    const insertPos = this.resolveInsertPosition()
    if (insertPos === null) return

    const items = filterSlashCommandItems(this.options.getGroups(), '', this.editor)
    if (!items.length) return this.hideButton()

    // Open slash menu without inserting "/" character
    const coords = this.view.coordsAtPos(insertPos)
    this.menu = new VueRenderer(SlashCommandMenu, {
      props: {
        items,
        editor: this.editor,
        range: { from: insertPos, to: insertPos },
        query: '',
        text: '',
        decorationNode: null,
        clientRect: () => new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top),
        command: (item: FlatSlashCommandItem) => this.runCommand(item, insertPos)
      },
      editor: this.editor
    })
    document.body.appendChild(this.menu.el)
    this.hideButton()
  }

  private isHoveringActiveBlock(e: MouseEvent, rect: DOMRect): boolean {
    if (!this.activeBlock) return false

    const node = this.view.state.doc.resolve(this.activeBlock.blockPos).nodeAfter
    if (!node) return false

    const top = this.view.coordsAtPos(this.activeBlock.blockPos).top
    const bottom = this.view.coordsAtPos(this.activeBlock.blockPos + node.nodeSize).bottom
    return e.clientY >= top && e.clientY <= bottom && e.clientX <= rect.right
  }

  private getHoveredBlock(e: MouseEvent): BlockContext | null {
    const pos = this.view.posAtCoords({
      left: e.clientX,
      top: e.clientY
    })

    return pos ? this.getBlockContextAtPos(pos.pos) : null
  }

  private getBlockContextAtPos(pos: number): BlockContext | null {
    const $pos = this.view.state.doc.resolve(pos)

    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d)
      if (node.isBlock && node.type.name !== 'doc') {
        const blockStart = $pos.start(d)
        return {
          blockDepth: d,
          blockPos: Math.max(0, blockStart - 1),
          blockStart
        }
      }
    }

    return null
  }

  private showButtonForBlock(blockContext: BlockContext, editorLeft: number): void {
    if (this.activeBlock?.blockPos === blockContext.blockPos) return

    this.activeBlock = {
      blockPos: blockContext.blockPos,
      blockDepth: blockContext.blockDepth
    }

    const coords = this.view.coordsAtPos(blockContext.blockStart)
    const buttonRef = this.button.ref as HoverInsertButtonRef | null
    buttonRef?.updatePosition({ top: coords.top, left: editorLeft - BUTTON_OFFSET })
    buttonRef?.show()
  }

  private resolveInsertPosition(): number | null {
    if (!this.activeBlock) return null

    const $pos = this.view.state.doc.resolve(this.activeBlock.blockPos + 1)
    const node = $pos.node(this.activeBlock.blockDepth)
    const blockPos = $pos.before(this.activeBlock.blockDepth)
    const isEmpty = node.textContent.length === 0

    // Reuse the empty hovered block directly; otherwise create a fresh paragraph below it.
    if (isEmpty) return blockPos + 1

    const afterBlockPos = blockPos + node.nodeSize
    this.insertParagraphAfter(afterBlockPos)

    return afterBlockPos + 1
  }

  private insertParagraphAfter(pos: number): void {
    this.editor.chain().focus().insertContentAt(pos, { type: 'paragraph' }).setTextSelection(pos + 1).run()
  }

  private runCommand(item: FlatSlashCommandItem, insertPos: number): void {
    // Clicking the floating UI can move focus/selection. Restore both explicitly so
    // command actions (e.g. toggling marks) target the hovered insertion position.
    this.editor.chain().focus().setTextSelection(insertPos).run()
    item.slashCommandAction({ editor: this.editor, range: { from: insertPos, to: insertPos } })
    this.closeMenu()
  }

  private closeMenu(): void {
    this.menu?.el?.remove()
    this.menu?.destroy()
    this.menu = null
  }

  private hideButton(): void {
    this.activeBlock = null
    const buttonRef = this.button.ref as HoverInsertButtonRef | null
    buttonRef?.hide()
  }
}

export const HoverInsertMenu = TipTapExtension.create<HoverInsertMenuOptions>({
  name: 'hoverInsertMenu',

  addOptions() {
    return {
      getGroups: () => []
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hoverInsertMenu'),
        view: (view) => new HoverInsertMenuView(view, this.editor, this.options)
      })
    ]
  }
})
