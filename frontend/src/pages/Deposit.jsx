import React, { useState } from 'react';
import api from '../services/api';
import '../App.css';

export default function Deposit() {
  const [asset, setAsset] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('crypto');
  const [message, setMessage] = useState('');

  const onDeposit = async () => {
    if (!amount || isNaN(amount)) return alert('Enter a valid amount');

    try {
      if (method === 'bank') {
        setMessage('Contact support for bank payment details. Upload receipt after payment.');
      } else {
        const res = await api.post('/api/balance/topup', { asset, amount: parseFloat(amount) });
        setMessage(`Balance updated: ${res.data.amount} ${asset}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Deposit Funds</h2>

      <div style={styles.row}>
        <label style={styles.label}>Asset:</label>
        <select value={asset} onChange={e => setAsset(e.target.value)} style={styles.select}>
          <option>USDT</option>
          <option>BTC</option>
          <option>ETH</option>
          <option>USDC</option>
          <option>TRX</option>
          <option>BNB</option>
          <option>TON</option>
          <option>SOL</option>
        </select>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Amount:</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Enter amount"
          style={styles.input}
        />
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Method:</label>
        <select value={method} onChange={e => setMethod(e.target.value)} style={styles.select}>
          <option value="crypto">Crypto</option>
          <option value="bank">Bank</option>
        </select>
      </div>

      <button onClick={onDeposit} style={styles.button}>Top Up</button>

      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "500px",
    margin: "30px auto",
    padding: "25px",
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
    marginBottom: "20px",
    color: "#1f2937"
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151"
  },
  input: {
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid rgba(0,0,0,0.3)",
    outline: "none",
    backgroundColor: "#fff",
    color: "#111",
    cursor: "text",
    transition: "all 0.2s ease",
  },
  select: {
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid rgba(0,0,0,0.3)",
    outline: "none",
    backgroundColor: "#fff",
    color: "#111",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  button: {
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #7e22ce)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
  },
  message: {
    marginTop: "15px",
    fontSize: "14px",
    color: "#1f2937",
    textAlign: "center"
  }
};

// For focus effect, add this CSS in App.css:
//
// input:focus, select:focus {
//   border-color: #111;
//   box-shadow: 0 0 3px rgba(0,0,0,0.2);
// }
