import { describe, expect, test } from 'bun:test';

import { nextPopupClosePollState, POPUP_CLOSED_CANCEL_GRACE_MS } from './web-auth-popup-close';

describe('nextPopupClosePollState', () => {
  test('does not cancel on the first closed observation', () => {
    const result = nextPopupClosePollState(true, { graceStartedAtMs: null }, 1000);
    expect(result.shouldCancel).toBe(false);
    expect(result.state.graceStartedAtMs).toBe(1000);
  });

  test('cancels only after the grace window elapses while still closed', () => {
    const start = nextPopupClosePollState(true, { graceStartedAtMs: null }, 0);
    const beforeGrace = nextPopupClosePollState(true, start.state, POPUP_CLOSED_CANCEL_GRACE_MS - 1);
    expect(beforeGrace.shouldCancel).toBe(false);

    const afterGrace = nextPopupClosePollState(true, start.state, POPUP_CLOSED_CANCEL_GRACE_MS);
    expect(afterGrace.shouldCancel).toBe(true);
  });

  test('resets grace when the popup is readable as open again', () => {
    const closed = nextPopupClosePollState(true, { graceStartedAtMs: null }, 0);
    const reopened = nextPopupClosePollState(false, closed.state, 500);
    expect(reopened.state.graceStartedAtMs).toBeNull();
    expect(reopened.shouldCancel).toBe(false);
  });
});
