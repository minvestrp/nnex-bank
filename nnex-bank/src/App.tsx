import React, { useEffect, useState } from "react";

type Screen =
  | "welcome"
  | "register"
  | "kyc"
  | "dashboard"
  | "transfer"
  | "beneficiaries";

type Currency = "USD" | "EUR" | "AED";

type Account = {
  id: string;
  name: string;
  currency: Currency;
  balance: number;
};

type Beneficiary = {
  id: string;
  name: string;
  iban: string;
  currency: Currency;
  template?: number;
};

type Tx = {
  id: string;
  to: string;
  amount: number;
  currency: Currency;
  date: string;
};

/** SAFE ID */
const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const storeKey = "nnex_bank_full_demo";

const money = (v: number, c: Currency) =>
  `${c === "USD" ? "$" : c === "EUR" ? "€" : "د.إ"}${v.toLocaleString()}`;

export default function App() {
  const saved = localStorage.getItem(storeKey);
  const initial = saved
    ? JSON.parse(saved)
    : {
        screen: "welcome" as Screen,
        email: "",
        accounts: [
          { id: "usd", name: "Main Account", currency: "USD", balance: 125418 },
          { id: "eur", name: "EU Account", currency: "EUR", balance: 64210 },
        ],
        beneficiaries: [
          {
            id: "b1",
            name: "White Crypto Swap",
            iban: "WCS-88921",
            currency: "USD",
            template: 25000,
          },
        ],
        txs: [] as Tx[],
        activeAccount: "usd",
        selectedBeneficiary: "",
        amount: "",
      };

  const [state, setState] = useState<any>(initial);

  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }, [state]);

  const acc = state.accounts.find((a: Account) => a.id === state.activeAccount);

  const send = () => {
    const b = state.beneficiaries.find(
      (x: Beneficiary) => x.id === state.selectedBeneficiary
    );
    const value = Number(state.amount);
    if (!b || !value || !acc || value > acc.balance) return;

    setState((s: any) => ({
      ...s,
      accounts: s.accounts.map((a: Account) =>
        a.id === acc.id ? { ...a, balance: a.balance - value } : a
      ),
      txs: [
        {
          id: genId(),
          to: b.name,
          amount: value,
          currency: acc.currency,
          date: new Date().toLocaleString(),
        },
        ...s.txs,
      ],
      amount: "",
      screen: "dashboard",
    }));
  };

  const reset = () => {
    localStorage.removeItem(storeKey);
    window.location.reload();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff" }}>
      <div style={{ width: 420, margin: "auto", padding: 28 }}>
        <h1>NNEX BANK</h1>
        <p>{money(acc?.balance || 0, acc?.currency || "USD")}</p>

        <button onClick={send}>Send</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
