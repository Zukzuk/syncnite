import { LETTERS } from "./constants";

export type Letter = typeof LETTERS[number];

export type SortKey = "title" | "source" | "tags" | "year";

export type SortDir = "asc" | "desc";

export type Phase = "unzip" | "copy" | null;
