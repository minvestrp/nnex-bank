// src/pages/api/bank/summary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { store } from "../_store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = String(req.headers["x-nnex-token"] || "");
    const user = store.getUserByToken(token);

    const accounts = store.listAccounts(user.id);
    const balances: Record<string, number> = {};
    for (const a of accounts) balances[a.id] = store.getBalanceMinor(a.id);

    const transactions = store.listTransactions(user.id);

    return res.status(200).json({ user, accounts, balances, transactions });
  } catch (e: any) {
    return res.status(401).json({ error: String(e?.message || e) });
  }
}
