import React, { useEffect, useState } from "react";
import { nnexApi } from "./lib/nnexCore";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("founder@nnex.bank");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);

  const login = async () => {
    const res = nnexApi.login(email);
    setToken(res.token);
  };

  useEffect(() => {
    if (!token) return;
    setAccounts(nnexApi.accounts(token));
    setTxs(nnexApi.transactions(token));
  }, [token]);

  if (!token)
    return (
      <div style={box}>
        <h1>NNEX BANK</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <button onClick={login}>Login</button>
      </div>
    );

  return (
    <div style={box}>
      <h2>Accounts</h2>
      {accounts.map((a) => (
        <div key={a.id}>
          {a.name} — {a.currency}
        </div>
      ))}

      <h2>Transactions</h2>
      {txs.map((t) => (
        <div key={t.id}>
          {t.type} {t.amountMinor / 100} {t.currency}
        </div>
      ))}
    </div>
  );
}

const box: React.CSSProperties = {
  background: "#000",
  color: "#fff",
  minHeight: "100vh",
  padding: 32,
  fontFamily: "Inter, system-ui",
};
