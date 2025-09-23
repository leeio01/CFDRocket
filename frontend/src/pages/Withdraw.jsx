import React, { useState } from 'react';
import api from '../services/api';
import '../App.css'; // Ensure CSS is imported

export default function Withdraw() {
  const [asset, setAsset] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('crypto');
  const [message, setMessage] = useState('');

  const onWithdraw = async () => {
    if (!amount || isNaN(amount)) return alert('Enter a valid amount');

    try {
      if (method === 'bank') {
        setMessage('Withdrawal initiated via bank. Awaiting approval.');
      } else {
        const res = await api.post('/api/balance/withdraw', { asset, amount: parseFloat(amount) });
        setMessage(`Withdrawal requested. Updated balance: ${res.data.amount} ${asset}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="withdraw-container card">
      <h2 className="withdraw-title">Withdraw Funds</h2>

      <div className="withdraw-row">
        <label>Asset:</label>
        <select value={asset} onChange={e => setAsset(e.target.value)}>
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

      <div className="withdraw-row">
        <label>Amount:</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Enter amount"
        />
      </div>

      <div className="withdraw-row">
        <label>Method:</label>
        <select value={method} onChange={e => setMethod(e.target.value)}>
          <option value="crypto">Crypto</option>
          <option value="bank">Bank</option>
        </select>
      </div>

      <button className="withdraw-btn" onClick={onWithdraw}>Withdraw</button>

      {message && <div className="withdraw-message">{message}</div>}
    </div>
  );
}
