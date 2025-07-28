import type { Body, DefinePluginOpts, Meta, Uppy } from '@uppy/core'
import { BasePlugin } from '@uppy/core'
import { getDroppedFiles } from './getDroppedFiles'
import toArray from '@uppy/utils/lib/toArray'
import { DropTargetOptions } from './types'
import { basename } from 'path'

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

  addFiles = (files: Array<File>): void => {
    const descriptors = files.map((file) => ({
      source: this.id,
      name: file.name,
      type: file.type,
      data: file,
      meta: {
        // path of the file relative to the ancestor directory the user selected.
        // e.g. 'docs/Old Prague/airbnb.pdf'
        relativePath: (file as any).relativePath || null
      } as any
    }))

    try {
      this.uppy.addFiles(descriptors)
    } catch (err) {
      this.uppy.log(err)
    }
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

    const emptyFolders: File[] = []
    const onEmptyFolderDetected = (path: string) => {
      // manually construct a file object for the folder that can be added to the Uppy state
      emptyFolders.push({
        // only use the name of the folder, not the full path
        name: basename(path),

        // fake directory mime type so it can be identified as a folder by the upload plugin
        type: 'directory',

        // set path as relativePath. this differs a bit from files where root files don't
        // have a relativePath.
        relativePath: path
      } as any) // need typecast because the File object does not have a relativePath property
    }

    const files = await getDroppedFiles(event.dataTransfer, onEmptyFolderDetected, logDropError)

    // add empty folders to the Uppy state so the upload plugin can handle them
    files.push(...emptyFolders)

    if (files.length > 0) {
      this.uppy.log('[DropTarget] Files were dropped')
      this.addFiles(files)
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
