import { eventSchema, SseEventWrapperOptions } from './types'

export const sseEventWrapper = (options: SseEventWrapperOptions) => {
  const { topic, msg, method, ...sseEventOptions } = options
  try {
    const sseData = eventSchema.parse(JSON.parse(msg.data))
    console.debug(`SSE event '${topic}'`, sseData)

    return method({ ...sseEventOptions, sseData })
  } catch (e) {
    console.error(`Unable to process sse event ${topic}`, e)
  }
}
