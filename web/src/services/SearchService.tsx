import type { ScoredHit, SortDir, SortKey } from "../types/app";
import { InterLinkedItem } from "../types/interlinked";
import { isGame } from "../utils";

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Mixed-origin source key:
 * - games: store source (steam/gog/...) if present, else origin
 * - others: origin (plex/komga/...)
 */
export function getSourceKey(item: InterLinkedItem): string {
  return isGame(item) ? norm(item.source) || norm(item.origin) : norm(item.origin);
}

export function isInstalled(item: InterLinkedItem): boolean {
  return isGame(item) ? !!item.isInstalled : false;
}

/** Text match across common fields (case-insensitive). */
export function matchesQuery(item: InterLinkedItem, q: string): boolean {
  const qv = norm(q);
  if (!qv) return true;

  if (norm(item.title).includes(qv)) return true;
  if (norm(item.sortingName).includes(qv)) return true;
  if (norm(item.version).includes(qv)) return true;
  if (norm(item.searchableDescription).includes(qv)) return true;

  if (item.tags?.some((t) => norm(t).includes(qv))) return true;
  if (item.series?.some((s) => norm(s).includes(qv))) return true;

  return false;
}

/** Tokenize a string into lowercase words, removing non-alphanumeric characters. */
function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Fuzzy word overlap search implementation. */
export function fuzzyWordOverlap<T>(
  query: string,
  items: T[],
  toString: (item: T) => string = (x) => String(x)
): ScoredHit<T>[] {
  const queryWords = tokenize(query);
  const hits: ScoredHit<T>[] = [];

  for (const item of items) {
    const candidateWords = tokenize(toString(item));
    let maxScore = 0;

    for (const q of queryWords) {
      for (const w of candidateWords) {
        if (q && w && q === w) {
          // score by matched token length (your original rule)
          if (w.length > maxScore) maxScore = w.length;
        }
      }
    }

    // Always include item — even if maxScore = 0
    hits.push({ item, score: maxScore });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits;
}

/**
 * Normalized value wrapper for sorting with "empties last".
 * - `empty` is always primary (false before true)
 * - `v` is the comparable value
 */
type Key =
  | { empty: boolean; kind: "str"; v: string }
  | { empty: boolean; kind: "num"; v: number };

function keyStr(s: string | null | undefined): Key {
  const v = norm(s);
  return { empty: v.length === 0, kind: "str", v };
}

function keyArr(a: string[] | null | undefined): Key {
  if (!a || a.length === 0) return { empty: true, kind: "str", v: "" };
  // stable-ish: don't reorder underlying array; just join normalized tokens
  const v = a.map((x) => norm(x)).filter(Boolean).join(", ");
  return { empty: v.length === 0, kind: "str", v };
}

function keyYear(y: number | null | undefined): Key {
  const empty = typeof y !== "number" || Number.isNaN(y);
  return { empty, kind: "num", v: empty ? 0 : y! };
}

function keyTitle(i: InterLinkedItem): Key {
  return keyStr(i.sortingName ?? i.title);
}

function selectKey(sortKey: SortKey, i: InterLinkedItem): Key {
  switch (sortKey) {
    case "title":
      return keyTitle(i);
    case "year":
      return keyYear(i.year);
    case "source":
      // "source" means store source for games, origin for everything else
      return keyStr(getSourceKey(i));
    case "tags":
      return keyArr(i.tags);
    case "series":
      return keyArr(i.series);
    default:
      return keyTitle(i);
  }
}

function compareKeys(a: Key, b: Key, dir: SortDir): number {
  // empties last regardless of direction
  if (a.empty !== b.empty) return a.empty ? 1 : -1;

  // numeric compare
  if (a.kind === "num" && b.kind === "num") {
    if (a.v === b.v) return 0;
    return dir === "asc" ? a.v - b.v : b.v - a.v;
  }

  // string compare (also covers mixed-kind fallback)
  const av = String(a.v);
  const bv = String(b.v);
  if (av === bv) return 0;
  return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
}

/**
 * Sort items by SortKey/SortDir.
 * - Non-mutating (returns a new array)
 * - Empties last
 * - Stable (final tie-breaker preserves input order)
 */
export function sortItems<T extends InterLinkedItem>(
  items: T[],
  sortKey: SortKey,
  sortDir: SortDir
): T[] {
  const decorated = items.map((item, idx) => ({
    item,
    idx,
    primary: selectKey(sortKey, item),
    title: keyTitle(item),
  }));

  decorated.sort((a, b) => {
    const p = compareKeys(a.primary, b.primary, sortDir);
    if (p !== 0) return p;

    const t = compareKeys(a.title, b.title, sortDir);
    if (t !== 0) return t;

    return a.idx - b.idx; // stable
  });

  return decorated.map((d) => d.item);
}
