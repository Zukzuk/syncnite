import { promises as fs } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS_ROOT, ADMIN_SUFFIX, STEAM_ROOT, USER_SUFFIX } from "../constants";
import { SteamWishlistSnapshot } from "./SteamService";

export type SteamConnection = {
    steamId: string;
    linkedAt: string;
};

export type Account = {
    email: string;
    password: string;
    clientId?: string;
    steam?: SteamConnection;
};

export type Role = "admin" | "user" | "unknown";

// Ensure the accounts directory exists
async function ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
}

// List all account files
async function listAllAccounts(): Promise<string[]> {
    try { return (await fs.readdir(ACCOUNTS_ROOT)); } catch { return []; }
}

// List all admin account files
async function listAdmins(): Promise<string[]> {
    const files = await listAllAccounts();
    return files.filter(f => f.endsWith(ADMIN_SUFFIX));
}

// Get the filename for an account by email
async function getFilenameByEmail(email: string): Promise<string | null> {
    const allAccounts = await listAllAccounts();
    const fileName = allAccounts.find(f => f.startsWith(email + ".") && (f.endsWith(ADMIN_SUFFIX) || f.endsWith(USER_SUFFIX)));
    return fileName || null;
}

// Read an account by email
async function readAccount(email: string): Promise<Account | null> {
    try {
        const fileName = await getFilenameByEmail(email);
        if (!fileName) return null;
        const raw = await fs.readFile(join(ACCOUNTS_ROOT, fileName), "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed?.email || !parsed?.password) return null;

        return {
            email: String(parsed.email),
            password: String(parsed.password),
            clientId: parsed.clientId ? String(parsed.clientId) : undefined,
            steam: parsed.steam,
        };
    } catch {
        return null;
    }
}

// Update an account
async function updateAccount(acc: Account): Promise<{ ok: true } | { ok: false; error: string }> {
    const fileName = await getFilenameByEmail(acc.email);
    if (!fileName) return { ok: false, error: "not_found" };

    if (fileName.endsWith(ADMIN_SUFFIX)) {
        await writeAdmin(acc);
    } else if (fileName.endsWith(USER_SUFFIX)) {
        await writeUser(acc);
    } else {
        return { ok: false, error: "unknown_role" };
    }

    return { ok: true };
}

// Write a user account
async function writeUser(acc: Account) {
    await ensureDir(ACCOUNTS_ROOT);
    await fs.writeFile(
        join(ACCOUNTS_ROOT, `${acc.email}${USER_SUFFIX}`),
        JSON.stringify(acc, null, 2),
        "utf8",
    );
}

// Write an admin account
async function writeAdmin(acc: Account) {
    await ensureDir(ACCOUNTS_ROOT);
    await fs.writeFile(
        join(ACCOUNTS_ROOT, `${acc.email}${ADMIN_SUFFIX}`),
        JSON.stringify(acc, null, 2),
        "utf8",
    );
}

// Write Steam wishlist snapshot to file
async function writeSteamWishlist(email: string, snapshot: any) {
    await ensureDir(STEAM_ROOT);
    await fs.writeFile(
        join(STEAM_ROOT, `${email}.steam.wishlist.json`),
        JSON.stringify(snapshot, null, 2),
        "utf8"
    );
}

/** 
 * Service for managing user and admin accounts.
 * Provides methods for login, registration, admin binding, and role retrieval.
 */
export const AccountsService = {

    /**
     * Logs in a user by verifying email and password.
     * @param email
     * @param password
     * @return true if login is successful, false otherwise
     */
    async login(email: string, password: string): Promise<boolean> {
        if (!email || !password) return false;
        const acc = await readAccount(email);
        return !!acc && acc.password === password;
    },

    /**
     * Registers a user account. Fails if no admin exists or if the user already exists.
     * @param email
     * @param password
     * @return { ok: true } on success, { ok: false, error: string } on failure
     */
    async registerUser(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
        await ensureDir(ACCOUNTS_ROOT);
        // require that an admin already exists
        const hasAdmin = await this.hasAdmin();
        if (!hasAdmin) return { ok: false, error: "no_admin_yet" };
        // check if user already exists
        const fileName = await getFilenameByEmail(email);
        if (fileName) return { ok: false, error: "user_exists" };
        // write new user account
        await writeUser({ email, password });
        return { ok: true };
    },

    /** 
     * Registers an admin account. Fails if an admin already exists.
     * @param email
     * @param password
     * @return { ok: true } on success, { ok: false, error: string } on failure
     */
    async registerAdmin(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
        await ensureDir(ACCOUNTS_ROOT);
        // check if an admin already exists
        const existing = await this.hasAdmin();
        if (existing) return { ok: false, error: "admin_exists" };
        // write new admin account
        await writeAdmin({ email, password });
        return { ok: true };
    },

    /**
     * Bind (or validate) the admin's clientId.
     * - First call with a clientId will *store* it on the admin account.
     * - Subsequent calls with the same clientId are OK.
     * - Calls with a different clientId return { ok: false, error: "admin_locked_elsewhere" }.
     * @param email
     * @param clientId
     * @return { ok: true } on success, { ok: false, error: string } on failure
     */
    async bindAdminClient(
        email: string,
        clientId: string,
    ): Promise<{ ok: true } | { ok: false; error: string }> {
        if (!clientId) {
            return { ok: false, error: "missing_client_id" };
        }

        const role = await this.getRole(email);
        if (role !== "admin") {
            return { ok: false, error: "forbidden" };
        }

        const acc = await this.getAccount(email);
        if (!acc) {
            return { ok: false, error: "not_found" };
        }

        // Already bound to a different install → hard fail
        if (acc.clientId && acc.clientId !== clientId) {
            return { ok: false, error: "admin_locked_elsewhere" };
        }

        // First time: bind to this Playnite installation
        if (!acc.clientId) {
            acc.clientId = clientId;
            await writeAdmin(acc);
        }

        return { ok: true };
    },

    /**
     * Removes an admin account. Fails if the account is not an admin.
     * @param email
     * @return { ok: true } on success, { ok: false, error: string } on failure
     */
    async removeAdmin(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
        const fileName = await getFilenameByEmail(email);
        if (!fileName || !fileName.endsWith(ADMIN_SUFFIX)) {
            return { ok: false, error: "not_admin" };
        }

        try {
            await fs.unlink(join(ACCOUNTS_ROOT, fileName));
            return { ok: true };
        } catch {
            return { ok: false, error: "io_error" };
        }
    },

    /**
     * Checks if at least one admin account exists.
     * @return true if an admin exists, false otherwise
     */
    async hasAdmin(): Promise<boolean> {
        const admins = await listAdmins();
        return admins.length ? true : false
    },

    /**
     * Gets an account by email.
     * @param email
     * @return Account or null if not found
     */
    async getAccount(email: string): Promise<Account | null> {
        return await readAccount(email);
    },

    /**
     * Gets the role of a user by email.
     * @param email
     * @return "admin", "user", or "unknown"
     */
    async getRole(email: string): Promise<Role> {
        const fileName = await getFilenameByEmail(email);
        if (!fileName) return "unknown";
        if (fileName.endsWith(ADMIN_SUFFIX)) return "admin";
        if (fileName.endsWith(USER_SUFFIX)) return "user";
        return "unknown";
    },

    /**
     * Sets or updates the Steam connection for an account.
     * @param email
     * @param steam
     * @return { ok: true } on success, { ok: false, error: string } on failure
     */
    async setSteamConnection(
        email: string,
        steam: SteamConnection,
    ): Promise<{ ok: true } | { ok: false; error: string }> {
        const acc = await this.getAccount(email);
        if (!acc) return { ok: false, error: "not_found" };
        acc.steam = steam;
        return await updateAccount(acc);
    },

    /**
     * Stores a Steam wishlist snapshot for an account.
     * @param email
     * @param snapshot
     * @return { ok: true } on success, { ok: false, error: string } on failure
     */
    async setSteamWishlistFile(
        email: string,
        snapshot: SteamWishlistSnapshot,
    ): Promise<{ ok: true } | { ok: false; error: string }> {
        const fileName = await getFilenameByEmail(email);
        if (!fileName) return { ok: false, error: "not_found" };

        try {
            await writeSteamWishlist(email, snapshot);
            return { ok: true };
        } catch {
            return { ok: false, error: "io_error" };
        }
    },

    /**
     * Appends a single wishlist entry to the snapshot file for an account.
     * Updates lastSynced on each append.
     * @param email
     * @param entry
     * @return { ok: true } on success, { ok: false, error: string } on failure
     */
    async appendSteamWishlistItem(
        email: string,
        entry: any,
    ): Promise<{ ok: true } | { ok: false; error: string }> {
        const existing = (await this.getSteamWishlistFile(email)) as SteamWishlistSnapshot | null;

        const now = new Date().toISOString();
        const snapshot: SteamWishlistSnapshot = {
            lastSynced: existing?.lastSynced ?? now,
            items: Array.isArray(existing?.items) ? [...existing!.items, entry] : [entry],
        };

        return this.setSteamWishlistFile(email, snapshot);
    },

    /**
     * Gets the Steam wishlist snapshot for an account.
     * @param email
     * @return SteamWishlistSnapshot or null if not found
     */
    async getSteamWishlistFile(email: string): Promise<any | null> {
        const fileName = await getFilenameByEmail(email);
        if (!fileName) return null;

        const snapshotFile = join(STEAM_ROOT, `${email}.steam.wishlist.json`);

        try {
            const raw = await fs.readFile(snapshotFile, "utf8");
            return JSON.parse(raw);
        } catch {
            return null;
        }
    },
};