// src/store.ts
// Simple localStorage-backed store for NNEX BANK demo.
// No crypto.randomUUID() (Netlify/TS compatibility).

export type Currency = "USD" | "USDT";

export type TxStatus = "pending" | "success" | "failed";
export type TxType = "transfer" | "deposit" | "withdraw";

export type KycStatus = "none" | "pending" | "approved";

export interface User {
  id: string;
  email: string;
  phone?: string;
  kyc: KycStatus;
  createdAt: number;
}

export interface Account {
  id: string;
  title: string;
  currency: Currency;
  balance: number;
}

export interface Tx {
  id: string;
  ts: number;
  type: TxType;
  status: TxStatus;
  to?: string; // beneficiary name / address label
  amount: number;
  currency: Currency;
  note?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  kind: "bank" | "crypto";
  // bank fields
  bankName?: string;
  iban?: string;
  // crypto fields
  chain?: string; // TRON / ETH / etc
  address?: string;
  asset?: "USDT";
  createdAt: number;
}

export interface Template {
  id: string;
  title: string;
  beneficiaryId: string;
  amount: number;
  currency: Currency;
  note?: string;
  createdAt: number;
}

export interface BankState {
  user: User | null;
  accounts: Account[];
  txs: Tx[];
  beneficiaries: Beneficiary[];
  templates: Template[];
}

const LS_KEY = "nnex_bank_state_v1";

/**
 * Safe ID generator for browsers + Netlify builds.
 * (No crypto.randomUUID)
 */
export function createId(prefix = "id"): string {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 10)
  );
}

function now(): number {
  return Date.now();
}

function readLS(): BankState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BankState;
  } catch {
    return null;
  }
}

function writeLS(state: BankState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function seedIfEmpty(): BankState {
  const existing = readLS();
  if (existing) return existing;

  const demoUser: User = {
    id: createId("user"),
    email: "founder@nnex.bank",
    phone: "+12015550123",
    kyc: "approved",
    createdAt: now(),
  };

  const accounts: Account[] = [
    {
      id: createId("acc"),
      title: "Main account",
      currency: "USD",
      balance: 125430,
    },
    {
      id: createId("acc"),
      title: "USDT wallet",
      currency: "USDT",
      balance: 5021.55,
    },
  ];

  const beneficiaries: Beneficiary[] = [
    {
      id: createId("ben"),
      name: "White Crypto Swap",
      kind: "crypto",
      chain: "TRON",
      address: "TQ9m...demo...9a",
      asset: "USDT",
      createdAt: now(),
    },
    {
      id: createId("ben"),
      name: "Acme Consulting LLC",
      kind: "bank",
      bankName: "Demo Bank",
      iban: "DE00 0000 0000 0000 0000 00",
      createdAt: now(),
    },
  ];

  const templates: Template[] = [
    {
      id: createId("tpl"),
      title: "Monthly Ops (USDT)",
      beneficiaryId: beneficiaries[0].id,
      amount: 250,
      currency: "USDT",
      note: "Ops",
      createdAt: now(),
    },
    {
      id: createId("tpl"),
      title: "Consulting (USD)",
      beneficiaryId: beneficiaries[1].id,
      amount: 1200,
      currency: "USD",
      note: "Invoice",
      createdAt: now(),
    },
  ];

  const txs: Tx[] = [];

  const state: BankState = {
    user: demoUser,
    accounts,
    txs,
    beneficiaries,
    templates,
  };

  writeLS(state);
  return state;
}

export function getState(): BankState {
  return readLS() ?? seedIfEmpty();
}

export function setState(next: BankState) {
  writeLS(next);
}

export function resetState() {
  localStorage.removeItem(LS_KEY);
}

/* -------------------- USER -------------------- */

export function getUser(): User | null {
  return getState().user;
}

export function setUser(user: User | null) {
  const s = getState();
  const next: BankState = { ...s, user };
  setState(next);
}

/**
 * Demo login: if email matches, allow; otherwise create new user.
 */
export function loginByEmail(email: string): User {
  const s = getState();
  if (s.user && s.user.email.toLowerCase() === email.toLowerCase()) return s.user;

  const user: User = {
    id: createId("user"),
    email,
    kyc: "approved",
    createdAt: now(),
  };

  setState({ ...s, user });
  return user;
}

export function logout() {
  const s = getState();
  setState({ ...s, user: null });
}

/* -------------------- ACCOUNTS -------------------- */

export function listAccounts(): Account[] {
  return getState().accounts;
}

export function updateAccountBalance(accountId: string, newBalance: number) {
  const s = getState();
  const accounts = s.accounts.map((a) =>
    a.id === accountId ? { ...a, balance: newBalance } : a
  );
  setState({ ...s, accounts });
}

export function findAccountByCurrency(currency: Currency): Account | undefined {
  return getState().accounts.find((a) => a.currency === currency);
}

/* -------------------- TXS -------------------- */

export function listTxs(): Tx[] {
  // newest first
  return [...getState().txs].sort((a, b) => b.ts - a.ts);
}

export function pushTx(tx: Tx) {
  const s = getState();
  setState({ ...s, txs: [tx, ...s.txs] });
}

/* -------------------- BENEFICIARIES -------------------- */

export function listBeneficiaries(): Beneficiary[] {
  return [...getState().beneficiaries].sort((a, b) => b.createdAt - a.createdAt);
}

export function addBeneficiary(input: Omit<Beneficiary, "id" | "createdAt">): Beneficiary {
  const s = getState();
  const ben: Beneficiary = {
    ...input,
    id: createId("ben"),
    createdAt: now(),
  };
  setState({ ...s, beneficiaries: [ben, ...s.beneficiaries] });
  return ben;
}

export function removeBeneficiary(id: string) {
  const s = getState();
  const beneficiaries = s.beneficiaries.filter((b) => b.id !== id);
  const templates = s.templates.filter((t) => t.beneficiaryId !== id);
  setState({ ...s, beneficiaries, templates });
}

/* -------------------- TEMPLATES -------------------- */

export function listTemplates(): Template[] {
  return [...getState().templates].sort((a, b) => b.createdAt - a.createdAt);
}

export function addTemplate(input: Omit<Template, "id" | "createdAt">): Template {
  const s = getState();
  const tpl: Template = {
    ...input,
    id: createId("tpl"),
    createdAt: now(),
  };
  setState({ ...s, templates: [tpl, ...s.templates] });
  return tpl;
}

export function removeTemplate(id: string) {
  const s = getState();
  setState({ ...s, templates: s.templates.filter((t) => t.id !== id) });
}

/* -------------------- TRANSFERS -------------------- */

/**
 * Executes a demo transfer:
 * - decreases balance in matching currency account
 * - creates Tx record
 */
export function sendTransfer(params: {
  beneficiaryId: string;
  amount: number;
  currency: Currency;
  note?: string;
}): { ok: true; tx: Tx } | { ok: false; error: string } {
  const { beneficiaryId, amount, currency, note } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Invalid amount" };
  }

  const s = getState();
  const acc = s.accounts.find((a) => a.currency === currency);
  if (!acc) return { ok: false, error: "Account not found" };

  if (acc.balance < amount) return { ok: false, error: "Insufficient funds" };

  const ben = s.beneficiaries.find((b) => b.id === beneficiaryId);
  if (!ben) return { ok: false, error: "Beneficiary not found" };

  // apply balance update
  const accounts = s.accounts.map((a) =>
    a.id === acc.id ? { ...a, balance: +(a.balance - amount).toFixed(2) } : a
  );

  const tx: Tx = {
    id: createId("tx"),
    ts: now(),
    type: "transfer",
    status: "success",
    to: ben.name,
    amount: +amount.toFixed(2),
    currency,
    note,
  };

  setState({ ...s, accounts, txs: [tx, ...s.txs] });
  return { ok: true, tx };
}

/**
 * Runs a template (transfer preset)
 */
export function runTemplate(templateId: string): { ok: true; tx: Tx } | { ok: false; error: string } {
  const tpl = getState().templates.find((t) => t.id === templateId);
  if (!tpl) return { ok: false, error: "Template not found" };

  return sendTransfer({
    beneficiaryId: tpl.beneficiaryId,
    amount: tpl.amount,
    currency: tpl.currency,
    note: tpl.note,
  });
}
