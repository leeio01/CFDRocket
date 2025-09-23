import React, { useState } from 'react';
import api from '../services/api';
import '../App.css'; // Ensure CSS is imported

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
    <div className="deposit-container card">
      <h2 className="deposit-title">Deposit Funds</h2>

      <div className="deposit-row">
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

      <div className="deposit-row">
        <label>Amount:</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Enter amount"
        />
      </div>

      <div className="deposit-row">
        <label>Method:</label>
        <select value={method} onChange={e => setMethod(e.target.value)}>
          <option value="crypto">Crypto</option>
          <option value="bank">Bank</option>
        </select>
      </div>

      <button className="deposit-btn" onClick={onDeposit}>Top Up</button>

      {message && <div className="deposit-message">{message}</div>}
    </div>
  );
}
