import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { z } from 'zod'

export const ProcessorType = z.enum(['fit', 'resize', 'fill', 'thumbnail'])

export type ProcessorType = z.infer<typeof ProcessorType>

export interface BuildQueryStringOptions {
  preview?: number
  scalingup?: number
  etag?: string
  dimensions?: [number, number]
  processor?: ProcessorType
}

export interface LoadPreviewOptions {
  space: SpaceResource
  resource: Resource
  dimensions?: [number, number]
  // FIXME: make this required in the next major, so every caller decides on a
  // processor instead of inheriting whatever the server falls back to.
  processor?: ProcessorType
}
