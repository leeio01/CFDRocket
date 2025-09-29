import React, { useEffect, useState } from 'react';
import api, { setAuthToken } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState([]);
  const [balance, setBalance] = useState(0);
  const [growthRate, setGrowthRate] = useState(2.83);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    if (token) setAuthToken(token);

    const fetchBalance = async () => {
      try {
        const res = await api.get('/api/balance');
        setBalances(res.data);

        const total = res.data.reduce((acc, b) => acc + b.amount, 0);
        setBalance(total);
      } catch (err) {
        console.error(err);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [token, navigate]);

  async function startSimulation() {
    try {
      await api.post('/api/simulation/start');
      alert('Simulation started');
    } catch (err) {
      alert('Error starting simulation: ' + err.message);
    }
  }

  async function pauseSimulation() {
    try {
      await api.post('/api/simulation/pause');
      alert('Simulation paused');
    } catch (err) {
      alert('Error pausing simulation: ' + err.message);
    }
  }

  async function stopSimulation() {
    try {
      await api.post('/api/simulation/stop');
      alert('Simulation stopped and balance reset');
    } catch (err) {
      alert('Error stopping simulation: ' + err.message);
    }
  }

  async function handleSetGrowthRate() {
    if (growthRate < 2.83 || growthRate > 15) {
      return alert('Growth rate must be between 2.83% and 15%');
    }

    try {
      await api.post('/api/simulation/set-growth', { rate: growthRate });
      alert(`Growth rate updated to ${growthRate}%`);
    } catch (err) {
      alert('Error setting growth rate: ' + err.message);
    }
  }

  return (
    <div className="dashboard-wrapper">
      {/* Total Balance Card */}
      <div className="dashboard-card">
        <h2 className="dashboard-balance">Demo Balance: {balance.toFixed(2)} USD</h2>
      </div>

      {/* Simulation Controls Card */}
      <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={startSimulation}>Start</button>
          <button onClick={pauseSimulation}>Pause</button>
          <button onClick={stopSimulation}>Stop</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label>Set Demo Growth Rate (% per day):</label>
          <input
            type="number"
            min="2.83"
            max="15"
            step="0.01"
            value={growthRate}
            onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
            style={{ width: '80px' }}
          />
          <button onClick={handleSetGrowthRate}>Set Growth Rate</button>
        </div>
      </div>

      {/* Balances Card */}
      <div className="dashboard-card">
        <h3>Balances</h3>
        <ul>
          {balances.map((b) => (
            <li key={b._id}>
              {b.asset}: {b.amount.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
