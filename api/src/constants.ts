import { join } from "node:path";

export const LOG_LEVEL = "info"; // "info" | "debug" | "trace"
export const UPLOADS_DIR = "/uploads";
export const WORK_DIR = "/work";
export const DATA_DIR = "/data";
export const ACC_DIR = join(DATA_DIR, "accounts");
export const ADMIN_SUFFIX = ".admin.json";
export const USER_SUFFIX = ".user.json";