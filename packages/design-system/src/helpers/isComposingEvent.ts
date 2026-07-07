// Whether the event is part of an IME composition session, e.g. the Enter confirming a CJK
// conversion. keyCode 229 covers browsers where `isComposing` is already unset (e.g. Safari).
export const isComposingEvent = (event: KeyboardEvent) => {
  return event.isComposing || event.keyCode === 229
}
