/** Grace period before treating popup.closed as user cancellation (COOP can sever opener early). */
export const POPUP_CLOSED_CANCEL_GRACE_MS = 2500;

export type PopupClosePollState = {
  graceStartedAtMs: number | null;
};

export function nextPopupClosePollState(
  closed: boolean,
  state: PopupClosePollState,
  nowMs: number,
  graceMs: number = POPUP_CLOSED_CANCEL_GRACE_MS,
): { state: PopupClosePollState; shouldCancel: boolean } {
  if (!closed) {
    return { state: { graceStartedAtMs: null }, shouldCancel: false };
  }
  if (state.graceStartedAtMs == null) {
    return { state: { graceStartedAtMs: nowMs }, shouldCancel: false };
  }
  if (nowMs - state.graceStartedAtMs >= graceMs) {
    return { state, shouldCancel: true };
  }
  return { state, shouldCancel: false };
}
