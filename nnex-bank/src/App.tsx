import React, { useEffect, useState } from "react";

/* ======================
   TYPES
====================== */
type Screen =
  | "welcome"
  | "dashboard"
  | "transfer"
  | "beneficiaries";

type Currency = "USD" | "EUR";

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
  template?: number;
};

type Tx = {
  id: string;
  to: string;
  amount: number;
  currency: Currency;
  date: string;
};

/* ======================
   HELPERS
====================== */
const storeKey = "nnex_bank_tg";

const money = (v: number, c: Currency) =>
  `${c === "USD" ? "$" : "€"}${v.toLocaleString()}`;

const uid = () =>
  `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

/* ======================
   TELEGRAM
====================== */
declare global {
  interface Window {
    Telegram?: any;
  }
}

/* ======================
   APP
====================== */
export default function App() {
  const tg = window.Telegram?.WebApp;

  const saved = localStorage.getItem(storeKey);
  const initial = saved
    ? JSON.parse(saved)
    : {
        screen: "welcome" as Screen,
        user: null as any,
        accounts: [
          { id: "usd", name: "Main Account", currency: "USD", balance: 125418 },
          { id: "eur", name: "EU Account", currency: "EUR", balance: 64210 },
        ],
        beneficiaries: [
          {
            id: "b1",
            name: "White Crypto Swap",
            iban: "WCS-88921",
            template: 25000,
          },
        ],
        txs: [] as Tx[],
        activeAccount: "usd",
        selectedBeneficiary: "",
        amount: "",
      };

  const [state, setState] = useState(initial);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();

      if (tg.initDataUnsafe?.user) {
        setState((s: any) => ({
          ...s,
          user: tg.initDataUnsafe.user,
          screen: "dashboard",
        }));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }, [state]);

  const acc = state.accounts.find((a: Account) => a.id === state.activeAccount);

  /* ======================
     ACTIONS
  ====================== */
  const send = () => {
    const b = state.beneficiaries.find(
      (x: Beneficiary) => x.id === state.selectedBeneficiary
    );
    const value = Number(state.amount);
    if (!b || !value || value <= 0 || !acc || value > acc.balance) return;

    setState((s: any) => ({
      ...s,
      accounts: s.accounts.map((a: Account) =>
        a.id === acc.id ? { ...a, balance: a.balance - value } : a
      ),
      txs: [
        {
          id: uid(),
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

    tg?.HapticFeedback?.impactOccurred("medium");
  };

  /* ======================
     UI
  ====================== */
  return (
    <div style={s.root}>
      <div style={s.card}>
        {state.screen === "welcome" && (
          <>
            <h1>NNEX BANK</h1>
            <p>Telegram Digital Bank</p>
            <p style={{ opacity: 0.6 }}>
              Open this app from Telegram
            </p>
          </>
        )}

        {state.screen === "dashboard" && (
          <>
            <h2>
              Welcome{" "}
              {state.user?.first_name || "Client"}
            </h2>

            <div style={s.balance}>
              {money(acc!.balance, acc!.currency)}
            </div>

            <button
              style={s.btn}
              onClick={() => setState({ ...state, screen: "transfer" })}
            >
              New Transfer
            </button>

            <button
              style={s.btnAlt}
              onClick={() => setState({ ...state, screen: "beneficiaries" })}
            >
              Beneficiaries
            </button>

            <div style={s.list}>
              {state.txs.length === 0 && <p>No transactions</p>}
              {state.txs.map((t: Tx) => (
                <div key={t.id} style={s.tx}>
                  <div>{t.to}</div>
                  <strong>- {money(t.amount, t.currency)}</strong>
                </div>
              ))}
            </div>
          </>
        )}

        {state.screen === "transfer" && (
          <>
            <h2>Transfer</h2>

            <select
              style={s.input}
              value={state.selectedBeneficiary}
              onChange={(e) => {
                const b = state.beneficiaries.find(
                  (x: Beneficiary) => x.id === e.target.value
                );
                setState({
                  ...state,
                  selectedBeneficiary: e.target.value,
                  amount: b?.template?.toString() || "",
                });
              }}
            >
              <option value="">Select beneficiary</option>
              {state.beneficiaries.map((b: Beneficiary) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <input
              style={s.input}
              placeholder="Amount"
              value={state.amount}
              onChange={(e) => setState({ ...state, amount: e.target.value })}
            />

            <button style={s.btn} onClick={send}>
              Send
            </button>

            <button
              style={s.btnAlt}
              onClick={() => setState({ ...state, screen: "dashboard" })}
            >
              Back
            </button>
          </>
        )}

        {state.screen === "beneficiaries" && (
          <>
            <h2>Beneficiaries</h2>
            {state.beneficiaries.map((b: Beneficiary) => (
              <div key={b.id} style={s.benef}>
                <div>{b.name}</div>
                <small>{b.iban}</small>
              </div>
            ))}

            <button
              style={s.btnAlt}
              onClick={() => setState({ ...state, screen: "dashboard" })}
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ======================
   STYLES
====================== */
const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
    fontFamily: "Inter, system-ui",
  },
  card: {
    width: 420,
    padding: 24,
    borderRadius: 24,
    background: "#0f0f0f",
  },
  btn: {
    width: "100%",
    padding: 14,
    marginTop: 14,
    borderRadius: 12,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontWeight: 700,
  },
  btnAlt: {
    width: "100%",
    padding: 14,
    marginTop: 10,
    borderRadius: 12,
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    border: "none",
  },
  balance: {
    fontSize: 32,
    fontWeight: 900,
    margin: "16px 0",
  },
  list: {
    marginTop: 16,
  },
  tx: {
    padding: 10,
    background: "#111",
    borderRadius: 10,
    display: "flex",
    justifyContent: "space-between",
    marginTop: 8,
  },
  benef: {
    padding: 12,
    background: "#111",
    borderRadius: 12,
    marginTop: 10,
  },
};
