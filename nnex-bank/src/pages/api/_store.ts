// src/pages/api/_store.ts
// In-memory store for CodeSandbox dev runtime.
// Later we will swap this with SQLite/Postgres without changing API contracts.

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
  name: string;
  currency: Currency;
  createdAt: string;
};

export type Transaction = {
  id: string;
  type: "TOPUP" | "TRANSFER";
  status: "POSTED";
  createdAt: string;
  currency: Currency;
  amountMinor: number;
  fromAccountId?: string;
  toAccountId?: string;
  memo?: string;
  counterparty?: string;
};

export type LedgerEntry = {
  id: string;
  txId: string;
  accountId: string;
  amountMinor: number;
  createdAt: string;
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

class Store {
  users = new Map<string, User>();
  accounts = new Map<string, Account>();
  sessions = new Map<string, Session>();
  transactions = new Map<string, Transaction>();
  entries: LedgerEntry[] = [];

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

    this.postTopup(
      user.id,
      accUSD.id,
      5000,
      "Initial top-up",
      "NNEX Demo Funding"
    );
  }

  getUserByToken(token: string): User {
    const s = this.sessions.get(token);
    if (!s) throw new Error("Unauthorized");
    const u = this.users.get(s.userId);
    if (!u) throw new Error("Unauthorized");
    return u;
  }

  login(email: string) {
    this.bootstrap();
    const user = [...this.users.values()].find((u) => u.email === email);
    if (!user)
      throw new Error("User not found. Use founder@nnex.bank for demo.");
    const token = uid();
    this.sessions.set(token, { token, userId: user.id, createdAt: now() });
    return { token, user };
  }

  listAccounts(userId: string) {
    return [...this.accounts.values()].filter((a) => a.userId === userId);
  }

  getBalanceMinor(accountId: string) {
    let sum = 0;
    for (const e of this.entries)
      if (e.accountId === accountId) sum += e.amountMinor;
    return sum;
  }

  listTransactions(userId: string, limit = 50) {
    const userAccountIds = new Set(this.listAccounts(userId).map((a) => a.id));
    const txs = [...this.transactions.values()].filter((t) => {
      if (t.fromAccountId && userAccountIds.has(t.fromAccountId)) return true;
      if (t.toAccountId && userAccountIds.has(t.toAccountId)) return true;
      return false;
    });
    txs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return txs.slice(0, limit);
  }

  submitKyc(userId: string, fullName: string) {
    const u = this.users.get(userId);
    if (!u) throw new Error("User not found");
    const updated: User = {
      ...u,
      name: fullName || u.name,
      kycStatus: "PENDING",
    };
    this.users.set(userId, updated);
    return updated;
  }

  approveKyc(userId: string) {
    const u = this.users.get(userId);
    if (!u) throw new Error("User not found");
    const updated: User = { ...u, kycStatus: "APPROVED" };
    this.users.set(userId, updated);
    return updated;
  }

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

    this.postEntry({
      txId: tx.id,
      accountId: toAccountId,
      amountMinor: +amountMinor,
      memo,
      counterparty,
    });
    return tx;
  }

  private getOrCreateClearingAccount(currency: Currency) {
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

  transfer(
    userId: string,
    fromAccountId: string,
    to: string,
    amount: number,
    memo?: string
  ) {
    const fromAcc = this.accounts.get(fromAccountId);
    if (!fromAcc) throw new Error("From account not found");
    if (fromAcc.userId !== userId) throw new Error("Forbidden");

    const amountMinor = toMinor(amount);
    if (amountMinor <= 0) throw new Error("Amount must be > 0");

    const bal = this.getBalanceMinor(fromAcc.id);
    if (bal < amountMinor) throw new Error("Insufficient funds");

    const tx = this.postTx({
      type: "TRANSFER",
      currency: fromAcc.currency,
      amountMinor,
      fromAccountId: fromAcc.id,
      memo,
      counterparty: to,
    });

    this.postEntry({
      txId: tx.id,
      accountId: fromAcc.id,
      amountMinor: -amountMinor,
      memo,
      counterparty: to,
    });

    const clearingId = this.getOrCreateClearingAccount(fromAcc.currency);
    this.postEntry({
      txId: tx.id,
      accountId: clearingId,
      amountMinor: +amountMinor,
      memo,
      counterparty: `From ${userId}`,
    });

    return tx;
  }
}

export const store = new Store();
