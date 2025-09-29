import React, { useState } from "react";

export default function Transactions() {
  const [transactions] = useState([
    { type: "deposit", asset: "BTC", amount: 0.5, date: "2025-09-26" },
    { type: "withdraw", asset: "ETH", amount: 1.2, date: "2025-09-25" },
  ]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Transaction History</h2>
      <div style={styles.list}>
        {transactions.map((t, i) => (
          <div key={i} style={styles.item}>
            <span style={{ fontWeight: "600", textTransform: "capitalize" }}>{t.type}</span>
            <span>{t.amount} {t.asset}</span>
            <span style={{ color: "#6b7280", fontSize: "14px" }}>{t.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "30px auto",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
    backgroundColor: "#f9fafb",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    textAlign: "center",
    color: "#1f2937",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: "8px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    fontSize: "16px",
    transition: "all 0.2s ease",
    cursor: "default",
  },
};

// Optional: add hover effect in App.css
// .transaction-item:hover {
//   box-shadow: 0 4px 12px rgba(0,0,0,0.1);
//   background-color: #f3f4f6;
// }
