import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const res = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('adminToken', res.data.access_token);
      navigate('/admin/jobs');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="glass-panel p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-textMain">Admin Access</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-transparent border border-border rounded-lg p-3 text-textMain focus:outline-none focus:border-primary"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-transparent border border-border rounded-lg p-3 text-textMain focus:outline-none focus:border-primary"
              required 
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
