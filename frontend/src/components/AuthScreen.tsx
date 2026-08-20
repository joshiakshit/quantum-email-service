import { useState } from 'react';
import { ShieldCheck, Lock, Fingerprint, Zap, Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import * as api from '@/api';
import type { AuthState } from '@/types';

interface Props {
  onAuth: (auth: AuthState) => void;
}

const FEATURES = [
  { icon: Lock, title: 'ML-KEM-768', desc: 'NIST FIPS 203 post-quantum key encapsulation' },
  { icon: Fingerprint, title: 'ML-DSA-65', desc: 'NIST FIPS 204 quantum-safe digital signatures' },
  { icon: ShieldCheck, title: 'AES-256-GCM', desc: 'Authenticated symmetric encryption' },
  { icon: Zap, title: 'BB84 QKD', desc: 'Simulated quantum key distribution protocol' },
];

const STEPS = [
  'ML-KEM-768 keypair generated locally',
  'ML-DSA-65 signing keypair generated locally',
  'Public keys registered with Key Manager',
  'Secure session established',
];

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keygen, setKeygen] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        setKeygen(true);
        const data = await api.register(email, password);
        localStorage.setItem('qumail_token', data.token);
        onAuth(data);
      } else {
        setKeygen(true);
        const data = await api.login(email, password);
        localStorage.setItem('qumail_token', data.token);
        onAuth(data);
      }
    } catch (err: unknown) {
      setKeygen(false);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (keygen && loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg)', color: 'var(--color-text)',
        fontFamily: 'var(--font-body)', gap: 16,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Loader2 size={28} color="var(--color-accent)" className="spin" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-neutral-200)' }}>
          Generating quantum keypairs
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', textAlign: 'center', lineHeight: 1.6 }}>
          Setting up ML-KEM-768 and ML-DSA-65 keys<br />
          and registering with the Key Manager
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', fontSize: 14,
    fontFamily: 'inherit', borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-divider)',
    color: 'var(--color-text)', outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex',
      background: 'var(--color-bg)', color: 'var(--color-text)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        width: '46%', flex: 'none', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 56px',
        background: 'linear-gradient(160deg, #1a1538 0%, #0d0f1a 50%, #161826 100%)',
        borderRight: '1px solid color-mix(in srgb, var(--color-accent) 15%, transparent)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'radial-gradient(circle, var(--color-accent) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-accent-700), var(--color-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(145, 132, 217, 0.25)',
            }}>
              <ShieldCheck size={26} color="#fff" strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.03em' }}>QMail</div>
              <div style={{ fontSize: 11, color: 'var(--color-accent-400)', letterSpacing: '0.12em', marginTop: 2 }}>QUANTUM SECURE EMAIL</div>
            </div>
          </div>

          <h1 style={{
            fontSize: 34, fontWeight: 600, lineHeight: 1.25,
            fontFamily: 'var(--font-heading)', margin: '0 0 16px',
          }}>
            Post-quantum secure<br />communication
          </h1>

          <p style={{ fontSize: 15, color: 'var(--color-neutral-500)', lineHeight: 1.7, margin: '0 0 40px', maxWidth: 420 }}>
            End-to-end encrypted email built on NIST-standardized post-quantum
            cryptographic algorithms, designed for organizations handling
            classified and mission-critical communications.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)', flex: 'none',
                  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 15%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon size={16} color="var(--color-accent)" strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-neutral-200)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 56px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 8 }}>
            <Mail size={20} color="var(--color-accent)" strokeWidth={1.8} />
          </div>
          <h2 style={{
            fontSize: 24, fontWeight: 600, margin: '0 0 8px',
            fontFamily: 'var(--font-heading)',
          }}>
            {mode === 'login' ? 'Sign in to QMail' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-neutral-500)', margin: '0 0 28px', lineHeight: 1.6 }}>
            {mode === 'login'
              ? 'Enter your credentials to access your secure mailbox.'
              : 'Set up your account. Quantum keypairs are generated on first login.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(217, 79, 79, 0.1)', color: '#e06060',
                fontSize: 13, lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-neutral-400)' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                autoComplete="email"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-divider)'; }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-neutral-400)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder={mode === 'register' ? 'Create a password' : 'Enter your password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  style={{ ...inputStyle, paddingRight: 42 }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-divider)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: 'var(--color-neutral-600)', display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'register' && (
                <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
                  At least 8 characters, one uppercase letter, one digit
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-neutral-400)' }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-divider)'; }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 24px', borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent)', color: '#fff',
                fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p style={{
            textAlign: 'center', fontSize: 14, marginTop: 20,
            color: 'var(--color-neutral-500)',
          }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setConfirm(''); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontWeight: 500, fontSize: 14,
                fontFamily: 'inherit',
              }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          <div style={{
            marginTop: 24, padding: '16px 18px', borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)', border: '1px solid var(--color-divider)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-neutral-300)', marginBottom: 10 }}>
              What happens on first login
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--color-neutral-500)' }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flex: 'none',
                    background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                    color: 'var(--color-accent)', fontSize: 10, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
