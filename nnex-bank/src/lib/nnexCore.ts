// src/lib/nnexCore.ts
// NNEX BANK — MVP Core (in-memory)

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

export type LedgerEntry = {
  id: string;
  txId: string;
  accountId: string;
  amountMinor: number;
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
  amountMinor: number;
  fromAccountId?: string;
  toAccountId?: string;
  memo?: string;
  counterparty?: string;
};

type Session = { token: string; userId: string; createdAt: string };

const now = () => new Date().toISOString();

/** SAFE ID — CRA / Netlify compatible */
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const toMinor = (amount: number) => Math.round(amount * 100);
const fromMinor = (minor: number) => Math.round(minor) / 100;

class NNEXCore {
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

    this.postTopup(user.id, accUSD.id, 5000, "Initial top-up", "NNEX Demo");
  }

  login(email: string) {
    const user = [...this.users.values()].find((u) => u.email === email);
    if (!user) throw new Error("User not found");
    const token = uid();
    this.sessions.set(token, { token, userId: user.id, createdAt: now() });
    return { token, user };
  }

  getUserByToken(token: string) {
    const s = this.sessions.get(token);
    if (!s) throw new Error("Unauthorized");
    const u = this.users.get(s.userId);
    if (!u) throw new Error("Unauthorized");
    return u;
  }

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
    const updated = { ...u, kycStatus: "APPROVED" };
    this.users.set(u.id, updated);
    return updated;
  }

  listAccounts(token: string) {
    const u = this.getUserByToken(token);
    return [...this.accounts.values()].filter((a) => a.userId === u.id);
  }

  getBalanceMinor(accountId: string) {
    return this.entries
      .filter((e) => e.accountId === accountId)
      .reduce((s, e) => s + e.amountMinor, 0);
  }

  listTransactions(token: string) {
    const u = this.getUserByToken(token);
    const ids = new Set(
      [...this.accounts.values()]
        .filter((a) => a.userId === u.id)
        .map((a) => a.id)
    );

    return [...this.transactions.values()]
      .filter(
        (t) =>
          (t.fromAccountId && ids.has(t.fromAccountId)) ||
          (t.toAccountId && ids.has(t.toAccountId))
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  private postEntry(e: Omit<LedgerEntry, "id" | "createdAt">) {
    const entry: LedgerEntry = { ...e, id: uid(), createdAt: now() };
    this.entries.push(entry);
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
    const amountMinor = toMinor(amount);
    const tx = this.postTx({
      type: "TOPUP",
      currency: "USD",
      amountMinor,
      toAccountId,
      memo,
      counterparty,
    });

    this.postEntry({
      txId: tx.id,
      accountId: toAccountId,
      amountMinor,
      memo,
      counterparty,
    });

    return tx;
  }

  transfer(
    token: string,
    fromAccountId: string,
    to: string,
    amount: number,
    memo?: string
  ) {
    const u = this.getUserByToken(token);
    const acc = this.accounts.get(fromAccountId);
    if (!acc || acc.userId !== u.id) throw new Error("Forbidden");

    const minor = toMinor(amount);
    if (this.getBalanceMinor(acc.id) < minor)
      throw new Error("Insufficient funds");

    const tx = this.postTx({
      type: "TRANSFER",
      currency: acc.currency,
      amountMinor: minor,
      fromAccountId: acc.id,
      memo,
      counterparty: to,
    });

    this.postEntry({
      txId: tx.id,
      accountId: acc.id,
      amountMinor: -minor,
      memo,
      counterparty: to,
    });

    return tx;
  }

  formatMoney(minor: number, currency: Currency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(fromMinor(minor));
  }
}

const core = new NNEXCore();
core.bootstrap();

export const nnexApi = {
  login: (email: string) => core.login(email),
  me: (token: string) => core.getUserByToken(token),
  submitKyc: (t: string, n: string) => core.submitKyc(t, { fullName: n }),
  approveKycForDemo: (t: string) => core.approveKycForDemo(t),
  accounts: (t: string) => core.listAccounts(t),
  balanceMinor: (id: string) => core.getBalanceMinor(id),
  transactions: (t: string) => core.listTransactions(t),
  transfer: (t: string, f: string, to: string, a: number, m?: string) =>
    core.transfer(t, f, to, a, m),
  formatMoney: (m: number, c: Currency) => core.formatMoney(m, c),
};
