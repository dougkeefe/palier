import { ITEM_TYPES, ITEM_TYPE_DEFINITIONS, type ItemType } from "@palier/domain";
import { itemRenderers } from "@palier/ui";

/**
 * The item type registry's two halves meet here, in the composition root, which
 * is the only place §3.1 lets both `@palier/domain` and `@palier/ui` be seen at
 * once (ADR 17). The React-free `ITEM_TYPE_DEFINITIONS` and the `itemRenderers`
 * map are asserted to cover the same `ItemType` union — the "five members plus
 * the a11y contract" completeness that §4.5 requires, with the fifth member
 * (`render`) checked here rather than in the domain architecture test.
 */

/** True only when `A` and `B` are the exact same type. */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

/**
 * A compile error unless both maps are keyed by exactly the `ItemType` union.
 * Widening either map to `Record<string, …>`, or missing a member, makes this
 * `never` and the assignment fails to typecheck.
 */
type BothMapsCoverTheUnion = Equals<keyof typeof ITEM_TYPE_DEFINITIONS, ItemType> extends true
  ? Equals<keyof typeof itemRenderers, ItemType> extends true
    ? true
    : never
  : never;

export const ITEM_TYPE_REGISTRY_KEYS_MATCH: BothMapsCoverTheUnion = true;

/**
 * The runtime belt to the compile-time braces above: names any drift between the
 * two maps and the union, or returns null when all three agree. Pure, so both
 * outcomes are testable without breaking the real registry.
 */
export const registryKeysError = (
  definitionKeys: readonly string[],
  rendererKeys: readonly string[],
  typeKeys: readonly string[],
): string | null => {
  const types = [...typeKeys].sort().join(",");
  const definitions = [...definitionKeys].sort().join(",");
  const renderers = [...rendererKeys].sort().join(",");
  if (definitions === types && renderers === types) {
    return null;
  }
  return `Item type registry incomplete: definitions=[${definitions}] renderers=[${renderers}] types=[${types}]`;
};

/** Throws if the item type registry is not complete across all three sources. */
export const assertItemTypeRegistryComplete = (): void => {
  const error = registryKeysError(
    Object.keys(ITEM_TYPE_DEFINITIONS),
    Object.keys(itemRenderers),
    ITEM_TYPES,
  );
  if (error !== null) {
    throw new Error(error);
  }
};
