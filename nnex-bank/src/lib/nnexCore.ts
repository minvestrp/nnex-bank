// src/lib/nnexCore.ts
// NNEX BANK — CRA-compatible in-memory core (Netlify safe)

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
  createdAt: string;
  currency: Currency;
  amount: number;
  from?: string;
  to?: string;
};

const now = () => new Date().toISOString();

// ✅ SAFE UID FOR CRA / NETLIFY
const uid = () =>
  "id_" + Math.random().toString(36).slice(2) + "_" + Date.now();

class NNEXCore {
  users: User[] = [];
  accounts: Account[] = [];
  transactions: Transaction[] = [];

  bootstrap() {
    if (this.users.length) return;

    const user: User = {
      id: uid(),
      email: "founder@nnex.bank",
      name: "NNEX Founder",
      kycStatus: "APPROVED",
      createdAt: now(),
    };

    this.users.push(user);

    const usd: Account = {
      id: uid(),
      userId: user.id,
      name: "Main",
      currency: "USD",
      createdAt: now(),
    };

    const eur: Account = {
      id: uid(),
      userId: user.id,
      name: "Vault",
      currency: "EUR",
      createdAt: now(),
    };

    this.accounts.push(usd, eur);

    this.transactions.push({
      id: uid(),
      type: "TOPUP",
      currency: "USD",
      amount: 5000,
      to: "Initial funding",
      createdAt: now(),
    });
  }

  login(email: string) {
    const user = this.users.find((u) => u.email === email);
    if (!user) throw new Error("User not found");
    return user;
  }

  listAccounts(userId: string) {
    return this.accounts.filter((a) => a.userId === userId);
  }

  listTransactions() {
    return this.transactions.slice().reverse();
  }

  transfer(
    fromAccountId: string,
    to: string,
    amount: number,
    currency: Currency
  ) {
    if (amount <= 0) throw new Error("Invalid amount");

    this.transactions.push({
      id: uid(),
      type: "TRANSFER",
      currency,
      amount,
      from: fromAccountId,
      to,
      createdAt: now(),
    });
  }
}

const core = new NNEXCore();
core.bootstrap();

export const nnexApi = {
  login: async (email: string) => core.login(email),
  accounts: async (userId: string) => core.listAccounts(userId),
  transactions: async () => core.listTransactions(),
  transfer: async (
    fromAccountId: string,
    to: string,
    amount: number,
    currency: Currency
  ) => core.transfer(fromAccountId, to, amount, currency),
};
