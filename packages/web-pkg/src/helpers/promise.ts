export function isPromiseFulfilled<T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled'
}

export function isPromiseRejected<T>(
  result: PromiseSettledResult<T>
): result is PromiseRejectedResult {
  return result.status === 'rejected'
}
