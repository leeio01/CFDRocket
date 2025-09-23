import React, { useState } from 'react';
import api from '../services/api';
import '../App.css'; // make sure CSS is imported

export default function Convert() {
  const [fromAsset, setFromAsset] = useState('USDT');
  const [toAsset, setToAsset] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);

  const onConvert = async () => {
    if (!amount || isNaN(amount)) return alert('Enter a valid number');

    try {
      const res = await api.post('/api/trade/convert', {
        from: fromAsset,
        to: toAsset,
        amount: parseFloat(amount),
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert('Error converting: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="convert-container card">
      <h2 className="convert-title">Token Converter</h2>

      <div className="convert-row">
        <label>From:</label>
        <select value={fromAsset} onChange={e => setFromAsset(e.target.value)}>
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

      <div className="convert-row">
        <label>To:</label>
        <select value={toAsset} onChange={e => setToAsset(e.target.value)}>
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

      <div className="convert-row">
        <label>Amount:</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Enter amount"
        />
      </div>

      <button className="convert-btn" onClick={onConvert}>Convert</button>

      {result && (
        <div className="convert-result">
          <p>
            {amount} {fromAsset} → {result.convertedAmount} {toAsset}
          </p>
          <p>Rate: {result.rate}</p>
        </div>
      )}
    </div>
  );
}
