import { PluginOpts } from '@uppy/core'
import { UppyService } from '../uppyService'

export interface DropTargetOptions extends PluginOpts {
  target?: HTMLElement | string | null
  uppyService?: UppyService
  onDrop?: (event: DragEvent) => void
  onDragOver?: (event: DragEvent) => void
  onDragLeave?: (event: DragEvent) => void
}
