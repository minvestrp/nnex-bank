// src/lib/nnexCore.ts
// NNEX BANK — Netlify-safe MVP Core

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
const uid = () =>
  "id_" + Math.random().toString(36).slice(2) + "_" + Date.now();

const toMinor = (v: number) => Math.round(v * 100);
const fromMinor = (v: number) => v / 100;

class NNEXCore {
  users: User[] = [];
  accounts: Account[] = [];
  sessions: Session[] = [];
  transactions: Transaction[] = [];
  entries: LedgerEntry[] = [];

  bootstrap() {
    if (this.users.length) return;

    const user: User = {
      id: uid(),
      email: "founder@nnex.bank",
      name: "NNEX Founder",
      kycStatus: "PENDING",
      createdAt: now(),
    };

    this.users.push(user);

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

    this.accounts.push(accUSD, accEUR);

    this.postTopup(user.id, accUSD.id, 5000, "Initial funding", "NNEX Demo");
  }

  login(email: string) {
    const user = this.users.find((u) => u.email === email);
    if (!user) throw new Error("User not found");

    const token = uid();
    this.sessions.push({ token, userId: user.id, createdAt: now() });
    return { token, user };
  }

  me(token: string): User {
    const s = this.sessions.find((x) => x.token === token);
    if (!s) throw new Error("Unauthorized");

    const u = this.users.find((x) => x.id === s.userId);
    if (!u) throw new Error("Unauthorized");

    return u;
  }

  submitKyc(token: string, fullName: string) {
    const u = this.me(token);
    u.name = fullName || u.name;
    u.kycStatus = "PENDING";
    return u;
  }

  approveKycForDemo(token: string) {
    const u = this.me(token);
    u.kycStatus = "APPROVED";
    return u;
  }

  accountsByUser(token: string) {
    const u = this.me(token);
    return this.accounts.filter((a) => a.userId === u.id);
  }

  balanceMinor(accountId: string) {
    return this.entries
      .filter((e) => e.accountId === accountId)
      .reduce((s, e) => s + e.amountMinor, 0);
  }

  transactionsForUser(token: string) {
    const u = this.me(token);
    const ids = this.accounts
      .filter((a) => a.userId === u.id)
      .map((a) => a.id);

    return this.transactions.filter(
      (t) =>
        (t.fromAccountId && ids.includes(t.fromAccountId)) ||
        (t.toAccountId && ids.includes(t.toAccountId))
    );
  }

  private postTx(t: Omit<Transaction, "id" | "createdAt" | "status">) {
    const tx: Transaction = {
      ...t,
      id: uid(),
      status: "POSTED",
      createdAt: now(),
    };
    this.transactions.unshift(tx);
    return tx;
  }

  private postEntry(e: Omit<LedgerEntry, "id" | "createdAt">) {
    this.entries.push({ ...e, id: uid(), createdAt: now() });
  }

  postTopup(
    userId: string,
    accountId: string,
    amount: number,
    memo?: string,
    counterparty?: string
  ) {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (!acc || acc.userId !== userId) throw new Error("Forbidden");

    const minor = toMinor(amount);

    const tx = this.postTx({
      type: "TOPUP",
      currency: acc.currency,
      amountMinor: minor,
      toAccountId: acc.id,
      memo,
      counterparty,
    });

    this.postEntry({
      txId: tx.id,
      accountId: acc.id,
      amountMinor: minor,
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
    const u = this.me(token);
    const acc = this.accounts.find(
      (a) => a.id === fromAccountId && a.userId === u.id
    );
    if (!acc) throw new Error("Forbidden");

    const minor = toMinor(amount);
    if (this.balanceMinor(acc.id) < minor)
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
  me: (token: string) => core.me(token),
  submitKyc: (t: string, n: string) => core.submitKyc(t, n),
  approveKycForDemo: (t: string) => core.approveKycForDemo(t),
  accounts: (t: string) => core.accountsByUser(t),
  balanceMinor: (id: string) => core.balanceMinor(id),
  transactions: (t: string) => core.transactionsForUser(t),
  transfer: (
    t: string,
    accId: string,
    to: string,
    amount: number,
    memo?: string
  ) => core.transfer(t, accId, to, amount, memo),
  formatMoney: (m: number, c: Currency) => core.formatMoney(m, c),
};
