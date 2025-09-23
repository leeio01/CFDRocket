import React, { useEffect, useState } from 'react';
import api, { setAuthToken } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return navigate('/');
    setAuthToken(token);
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get('/api/balance');
      setBalances(res.data);
    } catch (err) {
      console.error(err);
      alert('Could not load balances');
    }
  }

  async function startSim() {
    try {
      await api.post('/api/trade/start-sim', { asset: 'USDT', startAmount: 1000 });
      load();
      alert('Simulation started');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function stopSim() {
    try {
      await api.post('/api/trade/stop-sim', { asset: 'USDT' });
      load();
      alert('Stopped');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  return (
    <div>
      <h2>Dashboard</h2>
      <div>
        <button onClick={startSim}>Start Demo Sim</button>
        <button onClick={stopSim}>Stop Demo Sim</button>
      </div>
      <h3>Balances</h3>
      <ul>
        {balances.map(b => <li key={b._id}>{b.asset}: {b.amount}</li>)}
      </ul>
    </div>
  );
}
