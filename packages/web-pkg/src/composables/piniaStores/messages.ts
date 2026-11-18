import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import { HttpError } from '@opencloud-eu/web-client'
import { Action, ActionOptions } from '../actions'

type MessageError = Error | HttpError

export interface Message {
  id: string
  title: string
  desc?: string
  errors?: MessageError[]
  errorLogContent?: string
  timeout?: number
  status?: 'passive' | 'primary' | 'success' | 'warning' | 'danger'
  actions?: Action[]
  actionOptions?: ActionOptions
}

export const useMessages = defineStore('messages', () => {
  const messages = ref<Message[]>([])

  const showMessage = (data: Omit<Message, 'id'>) => {
    const message: Message = { ...data, id: crypto.randomUUID() }
    messages.value.push(message)
    return message
  }

  const getXRequestIdsFromErrors = (errors: Message['errors']) => {
    const getXRequestID = (error: MessageError) => {
      return (error as HttpError).response?.headers?.get('x-request-id')
    }

    return errors
      .map((error) => getXRequestID(error))
      .filter(Boolean)
      .map((item) => `X-Request-Id: ${item}`)
      .join('\r\n')
  }

  const showErrorMessage = (data: Omit<Message, 'id'>) => {
    const message: Message = {
      id: crypto.randomUUID(),
      status: 'danger',
      timeout: 0,
      ...(data.errors && { errorLogContent: getXRequestIdsFromErrors(data.errors) }),
      ...data
    }

    messages.value.push(message)
    return message
  }

  const removeMessage = (message: Message) => {
    messages.value = unref(messages).filter(({ id }) => message.id !== id)
  }

  return {
    messages,
    showMessage,
    showErrorMessage,
    removeMessage
  }
})

export type MessageStore = ReturnType<typeof useMessages>
