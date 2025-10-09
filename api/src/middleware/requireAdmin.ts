import express from "express";
import { AccountsService } from "../services/AccountsService";

export async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const email = String(req.header("x-auth-email") || "").toLowerCase();
  const password = String(req.header("x-auth-password") || "");
  if (!await AccountsService.isAuthorized(email, password)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  next();
}