import { PlayniteGameLink } from "./playnite";

export interface SteamAppDetails {
    appid: number;
    name: string;
    type: string;
    images: {
        cover: string;
        cover2x: string;
        coverTall: string | null;
        header: string | null;
        capsule: string | null;
        capsulev5: string | null;
        capsuleSmall: string | null;
        capsuleLarge: string | null;
        wallpaper: string | null;
        hero: string | null;
        libraryCapsule: string | null;
        libraryLogo: string | null;
        libraryHero: string | null;
        icon: string | null;
    };

    price: {
        currency: string;
        initial: number;
        final: number;
        discountPercent: number;
    } | null;

    releaseDate: {
        date: string;
        comingSoon: boolean;
    } | null;

    link: string | null;
    links: PlayniteGameLink[] | null;
    year: number | null;
    tags: string[];
    series: string[];
    iconUrl: string | null;
    coverUrl: string | null;
    bgUrl: string | null;
}

export type SteamWishlistEntry = {
    appid: number;
    priority: number;
    dateAdded: string;
    details?: SteamAppDetails | null;
};

export type SteamWishlistSnapshot = {
    lastSynced: string;
    items: SteamWishlistEntry[];
    syncInProgress?: boolean;
};

export class SteamError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message?: string) {
        super(message ?? code);
        this.status = status;
        this.code = code;
    }
}