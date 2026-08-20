import { useState } from 'react';
import { ShieldCheck, Lock, Fingerprint, Zap, Loader2, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
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

const KEYGEN_STEPS = [
  'Generating ML-KEM-768 keypair',
  'Generating ML-DSA-65 signing keypair',
  'Registering keys with Key Manager',
  'Establishing secure session',
];

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keygen, setKeygen] = useState(false);
  const [keygenStep, setKeygenStep] = useState(0);
  const [error, setError] = useState('');
  const [formKey, setFormKey] = useState(0);

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
    setConfirm('');
    setFirstName('');
    setLastName('');
    setFormKey(k => k + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim() || !username.trim() || !password) {
        setError('Please fill in all fields');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    } else {
      if (!username.trim() || !password) {
        setError('Please fill in all fields');
        return;
      }
    }

    setLoading(true);
    setKeygen(true);
    setKeygenStep(0);

    const stepInterval = setInterval(() => {
      setKeygenStep(s => {
        if (s < KEYGEN_STEPS.length - 1) return s + 1;
        clearInterval(stepInterval);
        return s;
      });
    }, 800);

    try {
      let data: api.AuthResponse;
      if (mode === 'register') {
        data = await api.register(firstName.trim(), lastName.trim(), username.trim(), password);
      } else {
        data = await api.login(username.trim(), password);
      }
      clearInterval(stepInterval);
      setKeygenStep(KEYGEN_STEPS.length);
      setTimeout(() => {
        localStorage.setItem('qumail_token', data.token);
        onAuth(data);
      }, 600);
    } catch (err: unknown) {
      clearInterval(stepInterval);
      setKeygen(false);
      setKeygenStep(0);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  if (keygen && loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--fg)',
        fontFamily: 'var(--font-sans)', position: 'relative', overflow: 'hidden',
      }}>
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />

        <div style={{
          position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 32, maxWidth: 380, width: '100%', padding: '0 24px',
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulseSoft 2s ease-in-out infinite',
          }}>
            <ShieldCheck size={36} color="var(--accent)" strokeWidth={1.5} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
              Generating quantum keypairs
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
              Setting up your post-quantum secure identity
            </div>
          </div>

          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: 12,
            padding: 20, borderRadius: 'var(--radius-l)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          }}>
            {KEYGEN_STEPS.map((step, i) => {
              const done = i < keygenStep;
              const active = i === keygenStep;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
                    color: done ? 'var(--green)' : active ? 'var(--fg)' : 'var(--fg-faint)',
                    transition: 'color 0.3s',
                    animation: `fadeInUp 0.4s ease-out ${i * 0.15}s backwards`,
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flex: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'var(--green-bg)' : active ? 'var(--accent-bg)' : 'transparent',
                    border: `1px solid ${done ? 'var(--green-border)' : active ? 'var(--accent-border)' : 'var(--border)'}`,
                    transition: 'all 0.3s',
                  }}>
                    {done ? (
                      <Check size={12} color="var(--green)" strokeWidth={3} style={{ animation: 'checkPop 0.3s ease-out' }} />
                    ) : active ? (
                      <Loader2 size={12} color="var(--accent)" className="spin" />
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>{i + 1}</span>
                    )}
                  </div>
                  <span style={{ fontFamily: active || done ? 'var(--font-mono)' : undefined, fontSize: 12 }}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{
            width: '100%', height: 3, borderRadius: 2,
            background: 'var(--border)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'var(--accent)',
              width: `${((keygenStep + 1) / KEYGEN_STEPS.length) * 100}%`,
              transition: 'width 0.6s ease-out',
            }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex',
      background: 'var(--bg)', color: 'var(--fg)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Left panel */}
      <div style={{
        width: '46%', flex: 'none', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 56px',
        position: 'relative', overflow: 'hidden',
        borderRight: '1px solid var(--border)',
      }}>
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'radial-gradient(circle, var(--fg) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48,
            animation: 'fadeInUp 0.6s ease-out',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-l)',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px var(--accent-bg)',
            }}>
              <ShieldCheck size={26} color="#fff" strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.03em', lineHeight: 1 }}>QMail</div>
              <div style={{
                fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em',
                marginTop: 3, fontWeight: 500,
              }}>QUANTUM SECURE EMAIL</div>
            </div>
          </div>

          <h1 style={{
            fontSize: 36, fontWeight: 600, lineHeight: 1.2,
            margin: '0 0 16px', letterSpacing: '-0.02em',
            animation: 'fadeInUp 0.6s ease-out 0.1s backwards',
          }}>
            Post-quantum secure<br />communication
          </h1>

          <p style={{
            fontSize: 15, color: 'var(--fg-secondary)', lineHeight: 1.7,
            margin: '0 0 40px', maxWidth: 420,
            animation: 'fadeInUp 0.6s ease-out 0.2s backwards',
          }}>
            End-to-end encrypted email built on NIST-standardized post-quantum
            cryptographic algorithms, designed for organizations handling
            classified and mission-critical communications.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  animation: `fadeInUp 0.5s ease-out ${0.3 + i * 0.1}s backwards`,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-m)', flex: 'none',
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon size={18} color="var(--accent)" strokeWidth={1.6} />
                </div>
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--fg)',
                    fontFamily: 'var(--font-mono)',
                  }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="scrollbar-thin" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 56px',
        overflowY: 'auto',
      }}>
        <div key={formKey} style={{
          width: '100%', maxWidth: 400, margin: 'auto 0',
          animation: 'scaleIn 0.3s ease-out',
        }}>
          <h2 style={{
            fontSize: 24, fontWeight: 600, margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>
          <p style={{
            fontSize: 14, color: 'var(--fg-secondary)',
            margin: '0 0 28px', lineHeight: 1.6,
          }}>
            {mode === 'login'
              ? 'Enter your credentials to access your secure mailbox.'
              : 'Set up your quantum-secured email identity.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: mode === 'register' ? 12 : 16 }}>
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-m)',
                background: 'var(--red-bg)', color: 'var(--red)',
                fontSize: 13, lineHeight: 1.4,
                border: '1px solid rgba(239, 68, 68, 0.15)',
                animation: 'fadeIn 0.2s ease-out',
              }}>
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                animation: 'fadeInUp 0.3s ease-out',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)' }}>
                    First name
                  </label>
                  <input
                    className="input"
                    value={firstName}
                    onChange={e => { setFirstName(e.target.value); setError(''); }}
                    placeholder="John"
                    autoComplete="given-name"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)' }}>
                    Last name
                  </label>
                  <input
                    className="input"
                    value={lastName}
                    onChange={e => { setLastName(e.target.value); setError(''); }}
                    placeholder="Doe"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)' }}>
                Username
              </label>
              <input
                className="input"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder={mode === 'register' ? 'Choose a username' : 'Enter your username'}
                autoComplete="username"
              />
              {mode === 'register' && username.trim() && (
                <div style={{
                  fontSize: 12, color: 'var(--fg-muted)',
                  fontFamily: 'var(--font-mono)',
                  animation: 'fadeIn 0.2s ease-out',
                }}>
                  Your address: <span style={{ color: 'var(--accent)' }}>{username.trim()}@qumail.secure</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder={mode === 'register' ? 'Create a password' : 'Enter your password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: 'var(--fg-muted)', display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'register' && (
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  At least 8 characters, one uppercase, one digit
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 6,
                animation: 'fadeInUp 0.3s ease-out',
              }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)' }}>
                  Confirm password
                </label>
                <input
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                height: 44, fontSize: 14, fontWeight: 500,
                gap: 8, marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p style={{
            textAlign: 'center', fontSize: 14, marginTop: 20,
            color: 'var(--fg-secondary)',
          }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={switchMode}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontWeight: 500, fontSize: 14,
                fontFamily: 'inherit',
              }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          {mode === 'login' && (
            <div style={{
              marginTop: 24, padding: '16px 18px', borderRadius: 'var(--radius-l)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Lock size={12} color="var(--accent)" />
                What happens on first login
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'ML-KEM-768 keypair generated locally',
                  'ML-DSA-65 signing keypair generated locally',
                  'Public keys registered with Key Manager',
                  'Secure session established',
                ].map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 12, color: 'var(--fg-muted)',
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', flex: 'none',
                      background: 'var(--accent-bg)',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--accent)', fontSize: 10, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
