// src/pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { store } from "../_store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const { email } = req.body || {};
    const out = store.login(String(email || "").trim());

    // Simple token header for MVP (later: httpOnly cookie)
    return res.status(200).json(out);
  } catch (e: any) {
    return res.status(400).json({ error: String(e?.message || e) });
  }
}
