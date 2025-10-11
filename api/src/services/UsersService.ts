import { promises as fs } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "../helpers";

export type User = { email: string; password: string };

const ACC_DIR = join(DATA_DIR, "accounts");
const USER_SUFFIX = ".user.json";

async function ensureDir() { await fs.mkdir(ACC_DIR, { recursive: true }); }
async function listAll(): Promise<string[]> { try { return (await fs.readdir(ACC_DIR)); } catch { return []; } }

async function listUsers(): Promise<string[]> {
    const files = await listAll();
    return files.filter(f => f.endsWith(USER_SUFFIX));
}

async function readUser(email: string): Promise<User | null> {
    try {
        const raw = await fs.readFile(join(ACC_DIR, `${email}${USER_SUFFIX}`), "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed?.email || !parsed?.password) return null;
        return { email: String(parsed.email), password: String(parsed.password) };
    } catch { return null; }
}

async function writeUser(u: User) {
    await ensureDir();
    await fs.writeFile(join(ACC_DIR, `${u.email}${USER_SUFFIX}`), JSON.stringify(u, null, 2), "utf8");
}

export const UsersService = {
    async register(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
        await ensureDir();
        const exists = await readUser(email);
        if (exists) return { ok: false, error: "user_exists" };
        await writeUser({ email, password });
        return { ok: true };
    },

    async login(email: string, password: string): Promise<boolean> {
        const u = await readUser(email);
        return !!u && u.password === password;
    },

    async isAuthorized(email?: string, password?: string): Promise<boolean> {
        if (!email || !password) return false;
        const u = await readUser(email);
        return !!u && u.password === password;
    },

    async listEmails(): Promise<string[]> {
        const files = await listUsers();
        return files.map(f => f.replace(USER_SUFFIX, ""));
    },
};
