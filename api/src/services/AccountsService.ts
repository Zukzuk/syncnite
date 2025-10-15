import { promises as fs } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "../helpers";

export type Account = { email: string; password: string };

const ACC_DIR = join(DATA_DIR, "accounts");
const ADMIN_SUFFIX = ".admin.json";

async function ensureDir() {
    await fs.mkdir(ACC_DIR, { recursive: true });
}

async function listAll(): Promise<string[]> {
    try { return (await fs.readdir(ACC_DIR)); } catch { return []; }
}

async function listAdmins(): Promise<string[]> {
    const files = await listAll();
    return files.filter(f => f.endsWith(ADMIN_SUFFIX));
}

async function readAdmin(email: string): Promise<Account | null> {
    try {
        const raw = await fs.readFile(join(ACC_DIR, `${email}${ADMIN_SUFFIX}`), "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed?.email || !parsed?.password) return null;
        return { email: String(parsed.email), password: String(parsed.password) };
    } catch { return null; }
}

async function writeAdmin(acc: Account) {
    await ensureDir();
    await fs.writeFile(join(ACC_DIR, `${acc.email}${ADMIN_SUFFIX}`), JSON.stringify(acc, null, 2), "utf8");
}

export const AccountsService = {
    async currentAdmin(): Promise<string | null> {
        const admins = await listAdmins();
        if (admins.length === 0) return null;
        // single-admin design: first/only *.admin.json
        return admins[0].replace(ADMIN_SUFFIX, "");
    },

    async register(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
        await ensureDir();
        const existing = await this.currentAdmin();
        if (existing && existing !== email) return { ok: false, error: "admin_exists" };
        await writeAdmin({ email, password });
        return { ok: true };
    },

    async login(email: string, password: string): Promise<boolean> {
        const acc = await readAdmin(email);
        return !!acc && acc.password === password;
    },

    async isAuthorized(email?: string, password?: string): Promise<boolean> {
        if (!email || !password) return false;
        const admin = await this.currentAdmin();
        if (!admin || admin !== email) return false;
        return this.login(email, password);
    },
};