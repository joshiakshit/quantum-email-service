import { useState } from 'react';
import { ShieldCheck, ArrowRight, Key } from 'lucide-react';
import { register } from '@/api';
import type { AuthResponse } from '@/api';

interface Props {
  onAuth: (data: AuthResponse) => void;
}

export default function AuthScreen({ onAuth }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await register(name.trim(), email.trim());
      localStorage.setItem('qumail_token', data.token);
      onAuth(data);
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', color: 'var(--color-text)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        width: 420, padding: 32, borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-accent-700), var(--color-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={22} color="#fff" strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}>QMail</div>
            <div style={{ fontSize: 11, color: 'var(--color-accent-400)', letterSpacing: '0.06em' }}>QUANTUM SECURE</div>
          </div>
        </div>

        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontFamily: 'var(--font-heading)', fontWeight: 500 }}>
          Register your identity
        </h3>
        <p style={{ fontSize: 12, color: 'var(--color-neutral-500)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Generate ML-KEM-768 and ML-DSA-65 keypairs and register with the Key Manager.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="input"
            placeholder="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ fontSize: 13, padding: '10px 14px' }}
          />
          <input
            className="input"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRegister()}
            style={{ fontSize: 13, padding: '10px 14px' }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#e06666', marginTop: 10 }}>{error}</div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleRegister}
          disabled={loading || !name.trim() || !email.trim()}
          style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '11px 0', gap: 8 }}
        >
          {loading ? 'Generating keypairs…' : 'Register & generate keys'}
          {!loading && <ArrowRight size={14} />}
        </button>

        <div style={{
          marginTop: 20, padding: '12px 14px', borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg)', border: '1px solid var(--color-divider)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Key size={12} color="var(--color-accent)" strokeWidth={1.8} />
            <span style={{ fontSize: 11, color: 'var(--color-neutral-400)' }}>What happens on register:</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-neutral-600)', lineHeight: 1.7 }}>
            1. ML-KEM-768 keypair generated locally<br />
            2. ML-DSA-65 signing keypair generated locally<br />
            3. Public keys registered with Key Manager<br />
            4. JWT token obtained for API access
          </div>
        </div>
      </div>
    </div>
  );
}
