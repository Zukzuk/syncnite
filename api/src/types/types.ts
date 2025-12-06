import { GameLink } from "./playnite";

export interface GameItem {
  id: string;
  title: string;
  sortingName: string | null;
  gameId: string;
  source: string;
  tags: string[];
  series: string[];
  isHidden: boolean;
  isInstalled: boolean;
  link: string | null;
  links: GameLink[] | null;
  year: number | null;
  iconUrl: string | null;
  coverUrl: string | null;
  bgUrl: string | null;
};
