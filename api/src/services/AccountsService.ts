import { promises as fs } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS_ROOT, ADMIN_SUFFIX, USER_SUFFIX } from "../constants";

export type Account = { email: string; password: string };
export type Role = "admin" | "user" | "unknown";

async function ensureDir() {
    await fs.mkdir(ACCOUNTS_ROOT, { recursive: true });
}

async function listAllAccounts(): Promise<string[]> {
    try { return (await fs.readdir(ACCOUNTS_ROOT)); } catch { return []; }
}

async function listAdmins(): Promise<string[]> {
    const files = await listAllAccounts();
    return files.filter(f => f.endsWith(ADMIN_SUFFIX));
}

async function getFilenameByEmail(email: string): Promise<string | null> {
    const allAccounts = await listAllAccounts();
    const fileName = allAccounts.find(f => f.startsWith(email + ".") && (f.endsWith(ADMIN_SUFFIX) || f.endsWith(USER_SUFFIX)));
    return fileName || null;
}

async function readAccount(email: string): Promise<Account | null> {
    try {
        const fileName = await getFilenameByEmail(email);
        if (!fileName) return null;
        const raw = await fs.readFile(join(ACCOUNTS_ROOT, fileName), "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed?.email || !parsed?.password) return null;
        return { email: String(parsed.email), password: String(parsed.password) };
    } catch { return null; }
}

async function writeAdmin(acc: Account) {
    await ensureDir();
    await fs.writeFile(join(ACCOUNTS_ROOT, `${acc.email}${ADMIN_SUFFIX}`), JSON.stringify(acc, null, 2), "utf8");
}

async function writeUser(acc: Account) {
    await ensureDir();
    await fs.writeFile(join(ACCOUNTS_ROOT, `${acc.email}${USER_SUFFIX}`), JSON.stringify(acc, null, 2), "utf8");
}

export const AccountsService = {
    /** 
     * Registers an admin account. Fails if an admin already exists.
     * @param email
     * @param password
     * @return { ok: true } on success, { ok: false, error: string } on failure
     */
    async registerAdmin(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
        await ensureDir();
        // check if an admin already exists
        const existing = await this.hasAdmin();
        if (existing) return { ok: false, error: "admin_exists" };
        await writeAdmin({ email, password });
        return { ok: true };
    },
    
    /**
     * Registers a user account. Fails if no admin exists or if the user already exists.
     * @param email
     * @param password
     * @return { ok: true } on success, { ok: false, error: string } on failure
     */
    async registerUser(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
        await ensureDir();
        // require that an admin already exists
        const hasAdmin = await this.hasAdmin();
        if (!hasAdmin) return { ok: false, error: "no_admin_yet" };
        // check if user already exists
        const fileName = await getFilenameByEmail(email);
        if (fileName) return { ok: false, error: "user_exists" };
        await writeUser({ email, password });
        return { ok: true };
    },

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
     * Checks if at least one admin account exists.
     * @return true if an admin exists, false otherwise
     */
    async hasAdmin(): Promise<boolean> {
        const admins = await listAdmins();
        return admins.length ? true : false
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
};