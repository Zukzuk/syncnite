import { LETTERS } from "./constants";

export type Letter = typeof LETTERS[number];

export type SortKey = "title" | "series" | "year" | "source" | "tags";

export type SortDir = "asc" | "desc";

export type Phase = "unzip" | "copy" | null;

export type TabKey = "login" | "register";

export type ViewMode = "list" | "grid";
