// src/lib/nnexCore.ts
// NNEX BANK — MVP Core (in-memory) + minimal API-like functions
// Purpose: Replace localStorage demo with a real ledger model (double-entry-ish).

export type Currency = "USD" | "EUR" | "GBP" | "AED";

export type User = {
  id: string;
  email: string;
  name: string;
  kycStatus: "NOT_STARTED" | "PENDING" | "APPROVED";
  createdAt: string;
};

export type Account = {
  id: string;
  userId: string;
  name: string; // e.g., "Main"
  currency: Currency;
  createdAt: string;
};

export type LedgerEntry = {
  id: string;
  txId: string;
  accountId: string;
  // For simplicity: signed integer in "cents" (minor units)
  amountMinor: number; // +credit / -debit relative to account
  createdAt: string;
  memo?: string;
  counterparty?: string;
};

export type Transaction = {
  id: string;
  type: "TOPUP" | "TRANSFER";
  status: "POSTED";
  createdAt: string;
  currency: Currency;
  amountMinor: number; // absolute for display
  fromAccountId?: string;
  toAccountId?: string;
  memo?: string;
  counterparty?: string;
};

type Session = { token: string; userId: string; createdAt: string };

const now = () => new Date().toISOString();
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

const toMinor = (amount: number) => Math.round(amount * 100);
const fromMinor = (minor: number) => Math.round(minor) / 100;

class NNEXCore {
  users = new Map<string, User>();
  accounts = new Map<string, Account>();
  sessions = new Map<string, Session>();
  transactions = new Map<string, Transaction>();
  entries: LedgerEntry[] = [];

  // --- bootstrap demo
  bootstrap() {
    if (this.users.size > 0) return;

    const user: User = {
      id: uid(),
      email: "founder@nnex.bank",
      name: "NNEX Founder",
      kycStatus: "PENDING",
      createdAt: now(),
    };
    this.users.set(user.id, user);

    const accUSD: Account = {
      id: uid(),
      userId: user.id,
      name: "Main",
      currency: "USD",
      createdAt: now(),
    };
    const accEUR: Account = {
      id: uid(),
      userId: user.id,
      name: "Vault",
      currency: "EUR",
      createdAt: now(),
    };
    this.accounts.set(accUSD.id, accUSD);
    this.accounts.set(accEUR.id, accEUR);

    // Initial topup $5,000
    this.postTopup(
      user.id,
      accUSD.id,
      5000,
      "Initial top-up",
      "NNEX Demo Funding"
    );
  }

  // --- auth
  login(email: string) {
    // extremely simplified: email identifies user
    const user = [...this.users.values()].find((u) => u.email === email);
    if (!user)
      throw new Error("User not found. Use founder@nnex.bank for demo.");
    const token = uid();
    this.sessions.set(token, { token, userId: user.id, createdAt: now() });
    return { token, user };
  }

  getUserByToken(token: string): User {
    const s = this.sessions.get(token);
    if (!s) throw new Error("Unauthorized");
    const u = this.users.get(s.userId);
    if (!u) throw new Error("Unauthorized");
    return u;
  }

  // --- kyc
  submitKyc(token: string, payload: { fullName: string }) {
    const u = this.getUserByToken(token);
    const updated: User = {
      ...u,
      name: payload.fullName || u.name,
      kycStatus: "PENDING",
    };
    this.users.set(u.id, updated);
    return updated;
  }

  approveKycForDemo(token: string) {
    const u = this.getUserByToken(token);
    const updated: User = { ...u, kycStatus: "APPROVED" };
    this.users.set(u.id, updated);
    return updated;
  }

  // --- accounts
  listAccounts(token: string) {
    const u = this.getUserByToken(token);
    return [...this.accounts.values()].filter((a) => a.userId === u.id);
  }

  getBalanceMinor(accountId: string) {
    // balance is sum of entries
    let sum = 0;
    for (const e of this.entries)
      if (e.accountId === accountId) sum += e.amountMinor;
    return sum;
  }

  listTransactions(token: string, limit = 50) {
    const u = this.getUserByToken(token);
    const userAccountIds = new Set(
      [...this.accounts.values()]
        .filter((a) => a.userId === u.id)
        .map((a) => a.id)
    );

    // transactions include only those touching user's accounts
    const txs = [...this.transactions.values()].filter((t) => {
      if (t.fromAccountId && userAccountIds.has(t.fromAccountId)) return true;
      if (t.toAccountId && userAccountIds.has(t.toAccountId)) return true;
      return false;
    });

    txs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return txs.slice(0, limit);
  }

  // --- posting
  private postEntry(e: Omit<LedgerEntry, "id" | "createdAt">) {
    const entry: LedgerEntry = { ...e, id: uid(), createdAt: now() };
    this.entries.push(entry);
    return entry;
  }

  private postTx(t: Omit<Transaction, "id" | "createdAt" | "status">) {
    const tx: Transaction = {
      ...t,
      id: uid(),
      createdAt: now(),
      status: "POSTED",
    };
    this.transactions.set(tx.id, tx);
    return tx;
  }

  postTopup(
    userId: string,
    toAccountId: string,
    amount: number,
    memo?: string,
    counterparty?: string
  ) {
    const acc = this.accounts.get(toAccountId);
    if (!acc) throw new Error("Account not found");
    if (acc.userId !== userId) throw new Error("Forbidden");

    const amountMinor = toMinor(amount);
    const tx = this.postTx({
      type: "TOPUP",
      currency: acc.currency,
      amountMinor,
      toAccountId,
      memo,
      counterparty,
    });

    // credit user's account
    this.postEntry({
      txId: tx.id,
      accountId: toAccountId,
      amountMinor: +amountMinor,
      memo,
      counterparty,
    });

    return tx;
  }

  transfer(
    token: string,
    payload: {
      fromAccountId: string;
      to: string;
      amount: number;
      memo?: string;
    }
  ) {
    const u = this.getUserByToken(token);
    const fromAcc = this.accounts.get(payload.fromAccountId);
    if (!fromAcc) throw new Error("From account not found");
    if (fromAcc.userId !== u.id) throw new Error("Forbidden");

    const amountMinor = toMinor(payload.amount);
    if (amountMinor <= 0) throw new Error("Amount must be > 0");

    const bal = this.getBalanceMinor(fromAcc.id);
    if (bal < amountMinor) throw new Error("Insufficient funds");

    const tx = this.postTx({
      type: "TRANSFER",
      currency: fromAcc.currency,
      amountMinor,
      fromAccountId: fromAcc.id,
      memo: payload.memo,
      counterparty: payload.to,
    });

    // debit user's account
    this.postEntry({
      txId: tx.id,
      accountId: fromAcc.id,
      amountMinor: -amountMinor,
      memo: payload.memo,
      counterparty: payload.to,
    });

    // In real life we'd credit another internal/external account.
    // For MVP: credit an internal "clearing" shadow account per currency.
    const clearingId = this.getOrCreateClearingAccount(fromAcc.currency);
    this.postEntry({
      txId: tx.id,
      accountId: clearingId,
      amountMinor: +amountMinor,
      memo: payload.memo,
      counterparty: `From ${u.email}`,
    });

    return tx;
  }

  private getOrCreateClearingAccount(currency: Currency) {
    // single clearing per currency
    const existing = [...this.accounts.values()].find(
      (a) => a.userId === "SYSTEM" && a.currency === currency
    );
    if (existing) return existing.id;

    const sys: Account = {
      id: uid(),
      userId: "SYSTEM",
      name: "Clearing",
      currency,
      createdAt: now(),
    };
    this.accounts.set(sys.id, sys);
    return sys.id;
  }

  // --- helpers for UI
  formatMoney(minor: number, currency: Currency) {
    const v = fromMinor(minor);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(v);
  }
}

const core = new NNEXCore();
core.bootstrap();

// API-like facade
export const nnexApi = {
  login: async (email: string) => core.login(email),
  me: async (token: string) => core.getUserByToken(token),
  submitKyc: async (token: string, fullName: string) =>
    core.submitKyc(token, { fullName }),
  approveKycForDemo: async (token: string) => core.approveKycForDemo(token),
  accounts: async (token: string) => core.listAccounts(token),
  balanceMinor: async (accountId: string) => core.getBalanceMinor(accountId),
  transactions: async (token: string) => core.listTransactions(token),
  transfer: async (
    token: string,
    fromAccountId: string,
    to: string,
    amount: number,
    memo?: string
  ) => core.transfer(token, { fromAccountId, to, amount, memo }),
  formatMoney: (minor: number, currency: Currency) =>
    core.formatMoney(minor, currency),
};
