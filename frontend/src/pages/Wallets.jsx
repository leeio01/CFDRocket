import React, { useState } from "react";

export default function Wallets() {
  const [wallets, setWallets] = useState([
    { asset: "BTC", address: "" },
    { asset: "ETH", address: "" },
  ]);
  const [asset, setAsset] = useState("");
  const [address, setAddress] = useState("");

  const addWallet = (e) => {
    e.preventDefault();
    if (!asset || !address) return alert("Enter both fields");
    setWallets([...wallets, { asset, address }]);
    setAsset("");
    setAddress("");
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>Wallet Management</h2>

      <form onSubmit={addWallet} style={styles.form}>
        <input
          placeholder="Asset (e.g., BTC)"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Wallet Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ ...styles.input, width: "300px" }}
        />
        <button type="submit" style={styles.button}>Add Wallet</button>
      </form>

      <ul style={styles.list}>
        {wallets.map((w, i) => (
          <li key={i} style={styles.listItem}>
            <span style={styles.asset}>{w.asset}</span>: {w.address}
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto",
    background: "#f5f6fa",
    borderRadius: "12px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "20px",
    textAlign: "center",
  },
  form: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
    justifyContent: "center",
  },
  input: {
    padding: "10px",
    fontSize: "16px",
    border: "1px solid rgba(0,0,0,0.3)", // dim border
    borderRadius: "6px",
    outline: "none",
    backgroundColor: "#fff", // visible white background
    color: "#000", // black text
    transition: "border-color 0.3s, box-shadow 0.3s",
  },
  inputFocus: {
    borderColor: "#000", // border turns black on focus
    boxShadow: "0 0 5px rgba(0,0,0,0.2)",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #7e22ce)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  },
  list: {
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
  listItem: {
    padding: "8px 0",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "16px",
    color: "#374151",
  },
  asset: {
    fontWeight: "600",
    color: "#2563eb",
  },
};
