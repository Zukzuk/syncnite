import { promises as fs } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "../helpers";

export type Account = { email: string; password: string };

const ACC_DIR = join(DATA_DIR, "accounts");

async function ensureDir() {
    await fs.mkdir(ACC_DIR, { recursive: true });
}
async function listAccounts(): Promise<string[]> {
    try {
        const files = await fs.readdir(ACC_DIR);
        return files.filter((f) => f.endsWith(".json"));
    } catch {
        return [];
    }
}
async function readAccount(email: string): Promise<Account | null> {
    try {
        const raw = await fs.readFile(join(ACC_DIR, `${email}.json`), "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed?.email || !parsed?.password) return null;
        return { email: String(parsed.email), password: String(parsed.password) };
    } catch {
        return null;
    }
}
async function writeAccount(acc: Account) {
    await ensureDir();
    await fs.writeFile(join(ACC_DIR, `${acc.email}.json`), JSON.stringify(acc, null, 2), "utf8");
}

export const AccountsService = {
    async currentAdmin(): Promise<string | null> {
        const files = await listAccounts();
        if (files.length === 0) return null;
        // single-admin design: first/only file is the admin
        const email = files[0].replace(/\.json$/i, "");
        return email;
    },

    async register(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
        await ensureDir();
        const admin = await this.currentAdmin();
        if (admin && admin !== email) {
            return { ok: false, error: "admin_exists" };
        }
        await writeAccount({ email, password });
        return { ok: true };
    },

    async login(email: string, password: string): Promise<boolean> {
        const acc = await readAccount(email);
        return !!acc && acc.password === password;
    },

    async isAuthorized(email?: string, password?: string): Promise<boolean> {
        if (!email || !password) return false;
        const admin = await this.currentAdmin();
        if (!admin || admin !== email) return false;
        return this.login(email, password);
    },
};
