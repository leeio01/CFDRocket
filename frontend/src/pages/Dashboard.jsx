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

  const startSimulation = async () => {
    try {
      await api.post('/api/simulation/start');
      alert('Simulation started');
    } catch (err) {
      alert('Error starting simulation: ' + err.message);
    }
  };

  const pauseSimulation = async () => {
    try {
      await api.post('/api/simulation/pause');
      alert('Simulation paused');
    } catch (err) {
      alert('Error pausing simulation: ' + err.message);
    }
  };

  const stopSimulation = async () => {
    try {
      await api.post('/api/simulation/stop');
      alert('Simulation stopped and balance reset');
    } catch (err) {
      alert('Error stopping simulation: ' + err.message);
    }
  };

  const handleSetGrowthRate = async () => {
    if (growthRate < 2.83 || growthRate > 15) {
      return alert('Growth rate must be between 2.83% and 15%');
    }

    try {
      await api.post('/api/simulation/set-growth', { rate: growthRate });
      alert(`Growth rate updated to ${growthRate}%`);
    } catch (err) {
      alert('Error setting growth rate: ' + err.message);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.balance}>Balance: {balance.toFixed(2)} USD</h2>
      </div>

      <div style={styles.card}>
        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={startSimulation}>Start</button>
          <button style={styles.button} onClick={pauseSimulation}>Pause</button>
          <button style={styles.button} onClick={stopSimulation}>Stop</button>
        </div>

        <div style={styles.growthRateWrapper}>
          <label style={styles.label}>Set Growth Rate (% per day):</label>
          <input
            type="number"
            min="2.83"
            max="15"
            step="0.01"
            value={growthRate}
            onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
            style={styles.input}
          />
          <button style={styles.button} onClick={handleSetGrowthRate}>Set</button>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.heading}>Balances</h3>
        <ul>
          {balances.map((b) => (
            <li key={b._id} style={styles.listItem}>
              {b.asset}: {b.amount.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
    padding: '24px',
    alignItems: 'center',
    background: '#f3f4f6',
    minHeight: '100vh',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
    padding: '28px',
    width: '100%',
    maxWidth: '550px',
    transition: 'all 0.3s ease',
  },
  balance: {
    fontSize: '30px',
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    marginBottom: '18px',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #2563eb, #7e22ce)',
    color: '#fff',
    fontWeight: '600',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
  growthRateWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '500',
    fontSize: '16px',
    color: '#1f2937',
  },
  input: {
    width: '120px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.3)',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#111',
    transition: 'all 0.2s ease',
  },
  heading: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '14px',
    color: '#1f2937',
  },
  listItem: {
    padding: '10px 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '16px',
    color: '#374151',
  },
};
