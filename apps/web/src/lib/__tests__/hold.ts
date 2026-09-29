import type { createContainer } from "../container";

/** A promise that settles when the returned function is called. */
export const gate = (): { readonly opened: Promise<void>; readonly open: () => void } => {
  let open: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
};

/**
 * Hold the cost ledger's writes from the `from`th on (1 by default), which a metered call awaits
 * once OpenAI has answered, so a spending request is still out until `release`. `reached`
 * settles when the first held write arrives (progress.md D143).
 */
export const holdLedger = (
  c: ReturnType<typeof createContainer>,
  { from = 1 }: { readonly from?: number } = {},
): { readonly release: () => void; readonly reached: Promise<void> } => {
  const held = gate();
  const arrived = gate();
  const append = c.costLedger.append.bind(c.costLedger);
  let writes = 0;
  c.costLedger.append = async (entry) => {
    writes += 1;
    if (writes >= from) {
      arrived.open();
      await held.opened;
    }
    return append(entry);
  };
  return { release: held.open, reached: arrived.opened };
};
