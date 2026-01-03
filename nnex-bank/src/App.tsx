import React, { useEffect, useState } from "react";

/* ======================
   TYPES
====================== */
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

/* ======================
   HELPERS
====================== */
const storeKey = "nnex_bank_full_demo";

const money = (v: number, c: Currency) =>
  `${c === "USD" ? "$" : c === "EUR" ? "€" : "د.إ"}${v.toLocaleString()}`;

/* ======================
   APP
====================== */
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

  const [state, setState] = useState(initial);

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
          id: crypto.randomUUID(),
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

  /* ======================
     SCREENS
  ====================== */
  return (
    <div style={s.root}>
      <div style={s.card}>
        {state.screen === "welcome" && (
          <>
            <h1>NNEX BANK</h1>
            <p>Next-generation digital bank</p>
            <button
              style={s.btn}
              onClick={() => setState({ ...state, screen: "register" })}
            >
              Get Started
            </button>
          </>
        )}

        {state.screen === "register" && (
          <>
            <h1>Register</h1>
            <input
              style={s.input}
              placeholder="Email"
              value={state.email}
              onChange={(e) => setState({ ...state, email: e.target.value })}
            />
            <button
              style={s.btn}
              onClick={() => setState({ ...state, screen: "kyc" })}
            >
              Continue
            </button>
          </>
        )}

        {state.screen === "kyc" && (
          <>
            <h1>KYC Verification</h1>
            <p>Identity verification in progress…</p>
            <div style={s.kycBox}>
              ✔ Document uploaded
              <br />✔ Face verified
            </div>
            <button
              style={s.btn}
              onClick={() => setState({ ...state, screen: "dashboard" })}
            >
              Enter Bank
            </button>
          </>
        )}

        {state.screen === "dashboard" && (
          <>
            <h1>Dashboard</h1>
            <div style={s.balance}>{money(acc!.balance, acc!.currency)}</div>

            <button
              style={s.btnAlt}
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
              {state.txs.length === 0 && <p>No transactions yet</p>}
              {state.txs.map((t: Tx) => (
                <div key={t.id} style={s.tx}>
                  <div>{t.to}</div>
                  <strong>- {money(t.amount, t.currency)}</strong>
                </div>
              ))}
            </div>

            <button style={s.reset} onClick={reset}>
              Reset demo
            </button>
          </>
        )}

        {state.screen === "transfer" && (
          <>
            <h1>Transfer</h1>
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
          </>
        )}

        {state.screen === "beneficiaries" && (
          <>
            <h1>Beneficiaries</h1>
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
    padding: 28,
    borderRadius: 24,
    background: "#0f0f0f",
    boxShadow: "0 0 80px rgba(0,0,0,.8)",
  },
  btn: {
    width: "100%",
    padding: 14,
    marginTop: 16,
    borderRadius: 12,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  btnAlt: {
    width: "100%",
    padding: 14,
    marginTop: 12,
    borderRadius: 12,
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
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
    marginTop: 16,
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
  kycBox: {
    marginTop: 12,
    padding: 12,
    background: "#111",
    borderRadius: 12,
  },
  reset: {
    marginTop: 16,
    background: "none",
    border: "none",
    color: "#666",
    cursor: "pointer",
  },
};
