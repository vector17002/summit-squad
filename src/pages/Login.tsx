import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plane, Lock, Mail, UserPlus, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Check your email to confirm your account!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
      <div className="card" style={{ textAlign: 'center', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <Plane size={48} color="var(--primary)" />
        </div>
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>
          {mode === 'login' ? 'Welcome Back' : 'Join Summit Squad'}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {mode === 'login' 
            ? 'Sign in to access your trips.' 
            : 'Join Summit Squad to start planning.'}
        </p>

        <form onSubmit={handleAuth}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
            disabled={loading}
          >
            {mode === 'login' ? <LogIn size={18} style={{ marginRight: '8px' }} /> : <UserPlus size={18} style={{ marginRight: '8px' }} />}
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem' }}>
          <button 
            type="button" 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} 
            style={{ color: 'var(--primary)', fontSize: '0.9rem' }}
          >
            {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>

        {message && (
          <p style={{ 
            marginTop: '1.5rem', 
            padding: '0.75rem',
            borderRadius: '8px',
            background: message.startsWith('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: message.startsWith('Error') ? '#ef4444' : '#10b981',
            fontSize: '0.9rem',
            border: `1px solid ${message.startsWith('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
