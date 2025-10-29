import { promises as fs } from "node:fs";
import { join } from "node:path";
import { ACC_DIR, ADMIN_SUFFIX, USER_SUFFIX } from "../constants";
import { get } from "node:http";

export type Account = { email: string; password: string };
export type Role = "admin" | "user" | "unknown";

async function ensureDir() {
    await fs.mkdir(ACC_DIR, { recursive: true });
}

async function listAllAccounts(): Promise<string[]> {
    try { return (await fs.readdir(ACC_DIR)); } catch { return []; }
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
        const raw = await fs.readFile(join(ACC_DIR, fileName), "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed?.email || !parsed?.password) return null;
        return { email: String(parsed.email), password: String(parsed.password) };
    } catch { return null; }
}

async function writeAdmin(acc: Account) {
    await ensureDir();
    await fs.writeFile(join(ACC_DIR, `${acc.email}${ADMIN_SUFFIX}`), JSON.stringify(acc, null, 2), "utf8");
}

async function writeUser(acc: Account) {
    await ensureDir();
    await fs.writeFile(join(ACC_DIR, `${acc.email}${USER_SUFFIX}`), JSON.stringify(acc, null, 2), "utf8");
}

export const AccountsService = {
    async registerAdmin(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
        await ensureDir();
        // check if an admin already exists
        const existing = await this.hasAdmin();
        if (existing) return { ok: false, error: "admin_exists" };
        await writeAdmin({ email, password });
        return { ok: true };
    },

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

    async login(email: string, password: string): Promise<boolean> {
        if (!email || !password) return false;
        const acc = await readAccount(email);
        return !!acc && acc.password === password;
    },

    async hasAdmin(): Promise<boolean> {
        const admins = await listAdmins();
        return admins.length ? true : false
    },

    async getRole(email: string): Promise<Role> {
        const fileName = await getFilenameByEmail(email);
        if (!fileName) return "unknown";
        if (fileName.endsWith(ADMIN_SUFFIX)) return "admin";
        if (fileName.endsWith(USER_SUFFIX)) return "user";
        return "unknown";
    },
};