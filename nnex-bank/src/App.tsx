import React, { useEffect, useState } from "react";
import { nnexApi, Currency } from "./lib/nnexCore";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    (async () => {
      const u = await nnexApi.login("founder@nnex.bank");
      setUser(u);
      const accs = await nnexApi.accounts(u.id);
      setAccounts(accs);
      const t = await nnexApi.transactions();
      setTxs(t);
    })();
  }, []);

  const send = async () => {
    const acc = accounts[0];
    await nnexApi.transfer(
      acc.id,
      to || "Demo recipient",
      Number(amount),
      acc.currency as Currency
    );
    const t = await nnexApi.transactions();
    setTxs(t);
    setAmount("");
    setTo("");
  };

  if (!user) return <div style={s.root}>Loading NNEX BANK…</div>;

  return (
    <div style={s.root}>
      <div style={s.card}>
        <h1>NNEX BANK</h1>

        <div style={s.balance}>
          ${accounts.length ? "5,000" : "0"}
        </div>

        <input
          style={s.input}
          placeholder="Recipient"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <input
          style={s.input}
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button style={s.btn} onClick={send}>
          Send
        </button>

        <div style={{ marginTop: 20 }}>
          {txs.map((t) => (
            <div key={t.id} style={s.tx}>
              <span>{t.type}</span>
              <strong>
                {t.currency} {t.amount}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s: any = {
  root: {
    minHeight: "100vh",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontFamily: "Inter",
  },
  card: {
    width: 420,
    padding: 28,
    borderRadius: 24,
    background: "#0f0f0f",
  },
  input: {
    width: "100%",
    padding: 12,
    marginTop: 10,
    borderRadius: 10,
    border: "none",
  },
  btn: {
    width: "100%",
    padding: 14,
    marginTop: 14,
    borderRadius: 12,
    background: "#4f46e5",
    border: "none",
    color: "#fff",
    fontWeight: 800,
  },
  balance: {
    fontSize: 32,
    marginBottom: 16,
    fontWeight: 900,
  },
  tx: {
    display: "flex",
    justifyContent: "space-between",
    background: "#111",
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
};
