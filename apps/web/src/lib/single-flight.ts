/**
 * Run `task` at most once at a time. A call made while it runs is not dropped and not
 * doubled: it earns exactly one more run after the current one, however many calls
 * arrive meanwhile. The telemetry flush uses it (progress.md D92), because an opt-in
 * queues events and asks for a flush that a flush already in flight would miss.
 *
 * A failed run is swallowed: the flush reports nothing to the person, and the queue it
 * failed to send is still there for the next trigger.
 */
export const singleFlight = (task: () => Promise<unknown>): (() => Promise<void>) => {
  let running: Promise<void> | null = null;
  let again = false;

  const start = (): Promise<void> => {
    running = (async () => {
      try {
        await task();
      } catch {
        // Deliberately empty: see above.
      }
      running = null;
      if (again) {
        again = false;
        await start();
      }
    })();
    return running;
  };

  return () => {
    if (running !== null) {
      again = true;
      return running;
    }
    return start();
  };
};
