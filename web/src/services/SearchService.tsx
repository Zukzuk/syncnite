import { ScoredHit, SortDir, SortKey } from "../types/app";
import { InterLinkedGameItem } from "../types/interlinked";

// Tokenize a string into lowercase words, removing non-alphanumeric characters.
function tokenize(input: string): string[] {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, " ")
        .split(/\s+/)
        .filter(Boolean);
}

// Fuzzy word overlap search implementation.
export function fuzzyWordOverlap<T>(
    query: string,
    items: T[],
    toString: (item: T) => string = (x) => String(x)
): ScoredHit<T>[] {
    const queryWords = tokenize(query);

    const hits: ScoredHit<T>[] = [];

    for (const item of items) {
        const text = toString(item);
        const candidateWords = tokenize(text);

        let maxScore = 0;

        for (const q of queryWords) {
            for (const w of candidateWords) {
                if (q && w && q === w) {
                    const wordLen = w.length;
                    if (wordLen > maxScore) {
                        maxScore = wordLen;
                    }
                }
            }
        }

        // Always include item — even if maxScore = 0
        hits.push({ item, score: maxScore });
    }

    // Sort by score (desc), stable for equal scores
    hits.sort((a, b) => b.score - a.score);

    return hits;
}

// helpers to rank empties last regardless of direction
const strKey = (s: string | null | undefined) => {
  const v = (s ?? "").trim().toLowerCase();
  return { empty: v.length === 0, v };
};
const arrKey = (a: string[] | null | undefined) => {
  const empty = !a || a.length === 0;
  return { empty, v: empty ? "" : a.join(",").toLowerCase() };
};
const yearKey = (y: number | null | undefined) => {
  const empty = typeof y !== "number";
  // keep numeric for comparisons; value only used when !empty
  return { empty, n: empty ? 0 : y as number };
};
const titleKey = (r: InterLinkedGameItem) => strKey(r.sortingName || r.title);

// Determine the letter for grouping
export const sortItems = (pass: InterLinkedGameItem[], sortKey: SortKey, sortDir: SortDir): InterLinkedGameItem[] => {
  return pass.sort((a, b) => {
    // Choose primary key
    if (sortKey === "year") {
      const ka = yearKey(a.year), kb = yearKey(b.year);
      if (ka.empty !== kb.empty) return ka.empty ? 1 : -1; // empties last
      if (!ka.empty && !kb.empty) {
        if (ka.n < kb.n) return sortDir === "asc" ? -1 : 1;
        if (ka.n > kb.n) return sortDir === "asc" ? 1 : -1;
      }
      // tie-breaker by title (empties last)
      const ta = titleKey(a), tb = titleKey(b);
      if (ta.empty !== tb.empty) return ta.empty ? 1 : -1;
      return sortDir === "asc" ? ta.v.localeCompare(tb.v) : tb.v.localeCompare(ta.v);
    }

    const pickKey = () => {
      if (sortKey === "title") return titleKey;
      if (sortKey === "source") return (r: InterLinkedGameItem) => strKey(r.source);
      if (sortKey === "tags") return (r: InterLinkedGameItem) => arrKey(r.tags);
      if (sortKey === "series") return (r: InterLinkedGameItem) => arrKey(r.series);
      return titleKey;
    };

    const ka = pickKey()(a);
    const kb = pickKey()(b);

    // empties last for strings/arrays
    if (ka.empty !== kb.empty) return ka.empty ? 1 : -1;

    // compare values in requested direction
    const av = (ka as any).v ?? "";
    const bv = (kb as any).v ?? "";
    if (av !== bv) return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);

    // final tie-breaker: title (empties last)
    const ta = titleKey(a), tb = titleKey(b);
    if (ta.empty !== tb.empty) return ta.empty ? 1 : -1;
    return sortDir === "asc" ? ta.v.localeCompare(tb.v) : tb.v.localeCompare(ta.v);
  });
};