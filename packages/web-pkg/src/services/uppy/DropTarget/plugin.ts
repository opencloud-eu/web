import type { Body, DefinePluginOpts, Meta, Uppy } from '@uppy/core'
import { BasePlugin } from '@uppy/core'
import { getDroppedFiles } from './getDroppedFiles'
import { toArray } from '@uppy/utils'
import { DropTargetOptions } from './types'
import { convertToMinimalUppyFile } from '../utils'

const defaultOpts = {
  target: null,
  uppyService: null
} satisfies DropTargetOptions

/**
 * This is an adaption of the official Uppy DropTarget plugin, extended by the
 * functionality to handle empty folders and integrated into our UppyService.
 * https://github.com/transloadit/uppy/tree/main/packages/%40uppy/drop-target
 */
export default class DropTarget<M extends Meta, B extends Body> extends BasePlugin<
  DefinePluginOpts<DropTargetOptions, keyof typeof defaultOpts>,
  M,
  B
> {
  private nodes?: Array<HTMLElement>
  private uppyService?: DropTargetOptions['uppyService']

  constructor(uppy: Uppy<M, B>, opts?: DropTargetOptions) {
    super(uppy, { ...defaultOpts, ...opts })
    this.type = 'acquirer'
    this.id = this.opts.id || 'DropTarget'
  }

  handleDrop = async (event: DragEvent): Promise<void> => {
    event.preventDefault()
    event.stopPropagation()

    this.setPluginState({ isDraggingOver: false })

    this.uppy.iteratePlugins((plugin) => {
      if (plugin.type === 'acquirer') {
        // @ts-expect-error Every Plugin with .type acquirer can define handleRootDrop(event)
        plugin.handleRootDrop?.(event)
      }
    })

    let executedDropErrorOnce = false
    const logDropError = (error: Error): void => {
      this.uppy.log(error, 'error')

      if (!executedDropErrorOnce) {
        this.uppy.info(error.message, 'error')
        executedDropErrorOnce = true
      }
    }

    const files = await getDroppedFiles(event.dataTransfer, logDropError)

    if (files.length > 0) {
      this.uppy.log('[DropTarget] Files were dropped')

      try {
        const uppyFiles = convertToMinimalUppyFile('DropTarget', files)
        this.uppyService.addFiles(uppyFiles)
      } catch (err) {
        this.uppy.log(err)
      }
    }

    this.opts.onDrop?.(event)
    this.uppyService?.publish('drop', event)
  }

  handleDragOver = (event: DragEvent): void => {
    event.preventDefault()
    event.stopPropagation()

    this.setPluginState({ isDraggingOver: true })
    this.opts.onDragOver?.(event)
    this.uppyService?.publish('drag-over', event)
  }

  handleDragLeave = (event: DragEvent): void => {
    event.preventDefault()
    event.stopPropagation()

    this.setPluginState({ isDraggingOver: false })
    this.opts.onDragLeave?.(event)
    this.uppyService?.publish('drag-out', event)
  }

  addListeners = (): void => {
    const { target, uppyService } = this.opts
    this.uppyService = uppyService

    if (target instanceof Element) {
      this.nodes = [target]
    } else if (typeof target === 'string') {
      this.nodes = toArray(document.querySelectorAll(target))
    }

    if (!this.nodes || this.nodes.length === 0) {
      throw new Error(`"${target}" does not match any HTML elements`)
    }

    this.nodes.forEach((node) => {
      node.addEventListener('dragover', this.handleDragOver, false)
      node.addEventListener('dragleave', this.handleDragLeave, false)
      node.addEventListener('drop', this.handleDrop, false)
    })
  }

  removeListeners = (): void => {
    if (this.nodes) {
      this.nodes.forEach((node) => {
        node.removeEventListener('dragover', this.handleDragOver, false)
        node.removeEventListener('dragleave', this.handleDragLeave, false)
        node.removeEventListener('drop', this.handleDrop, false)
      })
    }
  }

  install(): void {
    this.setPluginState({ isDraggingOver: false })
    this.addListeners()
  }

  uninstall(): void {
    this.removeListeners()
  }
}
