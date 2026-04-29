export const parseJsonStringIfNeeded = <T>(data: T | string): T => {
  if (typeof data !== 'string') {
    return data
  }

  try {
    return JSON.parse(data) as T
  } catch (error) {
    console.error('Failed to parse groupware JSON string response:', error)
    throw error
  }
}
