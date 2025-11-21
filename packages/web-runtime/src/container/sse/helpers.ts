import { eventSchema, SseEventWrapperOptions } from './types'

export const sseEventWrapper = async (options: SseEventWrapperOptions) => {
  const { topic, msg, method, ...sseEventOptions } = options
  try {
    const sseData = eventSchema.parse(JSON.parse(msg.data))
    console.debug(`SSE event '${topic}'`, sseData)

    await method({ ...sseEventOptions, sseData })
  } catch (e) {
    console.error(`Unable to process sse event ${topic}`, e)
  }
}
