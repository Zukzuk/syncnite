import { Letter } from "./constants";
import { InterLinkedGameItem, InterLinkedItem } from "./types/interlinked";

// Returns the first letter for ordering purposes
export function orderedLetters(
  title?: string | null,
  sortingName?: string | null
): Letter {
  const s = (sortingName || title || "").trim();
  if (!s) return "#";

  const c = s.charAt(0).toUpperCase();
  return (c >= "A" && c <= "Z" ? c : "#") as Letter;
}

// Returns true if the item is a game
export function isGame(item: InterLinkedItem): item is InterLinkedGameItem {
  return item.type === "game";
}
