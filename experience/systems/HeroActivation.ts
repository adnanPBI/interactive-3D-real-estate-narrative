export type R6Lod = "lod0" | "lod1" | "lod2" | "proxy";

const rank: Record<R6Lod, number> = { lod0: 0, lod1: 1, lod2: 2, proxy: 3 };

/** Return the lower-detail of a requested LOD and the current runtime ceiling. */
export function clampR6Lod(requested: R6Lod, ceiling: R6Lod): R6Lod {
  return rank[requested] >= rank[ceiling] ? requested : ceiling;
}
