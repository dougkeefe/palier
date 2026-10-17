/**
 * Run `task` only while no run of it is in flight: a call made meanwhile is dropped, never queued.
 * Unlike `singleFlight`, which earns a call one more run, this is for a press that spends (D237):
 * a second press before the button disables must not pay a second time.
 */
export const latch = <A extends unknown[]>(task: (...args: A) => Promise<void>): ((...args: A) => Promise<void>) => {
  let busy = false;
  return async (...args) => {
    if (busy) return;
    busy = true;
    try {
      await task(...args);
    } finally {
      busy = false;
    }
  };
};
