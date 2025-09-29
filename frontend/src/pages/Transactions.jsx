import React, { useState } from "react";

export default function Transactions() {
  const [transactions] = useState([
    { type: "deposit", asset: "BTC", amount: 0.5, date: "2025-09-26" },
    { type: "withdraw", asset: "ETH", amount: 1.2, date: "2025-09-25" },
  ]);

  return (
    <div>
      <h2>Transaction History (Demo)</h2>
      <ul>
        {transactions.map((t, i) => (
          <li key={i}>
            {t.type.toUpperCase()} – {t.amount} {t.asset} on {t.date}
          </li>
        ))}
      </ul>
    </div>
  );
}
