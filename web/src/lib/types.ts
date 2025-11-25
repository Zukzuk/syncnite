import { LETTERS } from "./constants";

export type Letter = typeof LETTERS[number];

export type SortKey = "title" | "series" | "year" | "source" | "tags";

export type SortDir = "asc" | "desc";

export type ViewMode = "list" | "grid";

export type Role = "admin" | "user" | "unknown";