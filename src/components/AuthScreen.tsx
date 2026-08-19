import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Building2,
  Loader2,
  KeyRound,
  Fingerprint,
  Atom,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { generateFingerprint, generateHexPreview } from '@/utils';

type RegStep = 'credentials' | 'keygen' | 'complete';

interface KeygenPhase {
  label: string;
  detail: string;
  done: boolean;
}

export default function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [step, setStep] = useState<RegStep>('credentials');
  const [email, setEmail] = useState('arjun.mehta@isro.gov.in');
  const [name, setName] = useState('Arjun Mehta');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organization, setOrganization] = useState('ISRO — Space Applications Centre');
  const [error, setError] = useState('');

  const [keygenPhases, setKeygenPhases] = useState<KeygenPhase[]>([
    { label: 'Generating ML-KEM-768 keypair', detail: 'CRYSTALS-Kyber (FIPS 203)', done: false },
    { label: 'Generating ML-DSA-65 keypair', detail: 'CRYSTALS-Dilithium (FIPS 204)', done: false },
    { label: 'Establishing QKD bootstrap channel', detail: 'BB84 key pre-distribution', done: false },
    { label: 'Registering with Key Manager', detail: 'Mutual TLS + JWT issuance', done: false },
  ]);
  const [fingerprint] = useState(() => generateFingerprint());
  const [hexPreview] = useState(() => generateHexPreview(80));

  useEffect(() => {
    if (step !== 'keygen') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    keygenPhases.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setKeygenPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, done: true } : p)));
        }, 800 * (i + 1))
      );
    });
    timers.push(
      setTimeout(() => setStep('complete'), 800 * (keygenPhases.length + 1) + 400)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleRegister = () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !name.trim() || !organization.trim() || !password) {
      setError('All fields are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address');
      return;
    }
    if (password.length < 12) {
      setError('Use a password with at least 12 characters');
      return;
    }
    setError('');
    setStep('keygen');
  };

  const handleLogin = () => {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setStep('keygen');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-quantum-radial" />
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-quantum-600/20 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-600/20 rounded-full blur-[120px] animate-pulse-slow" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-quantum-500 to-accent-600 flex items-center justify-center shadow-lg shadow-quantum-500/30 mb-4 animate-glow">
            <Atom className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">QuMail</h1>
          <p className="text-sm text-slate-400 mt-1">Quantum-Secure Email Client</p>
        </div>

        {step === 'credentials' && (
          <div className="glass border border-white/10 rounded-2xl p-8 animate-slide-up shadow-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Secure Access</h2>
              <p className="text-sm text-slate-400 mt-1">
                Register or sign in. Your post-quantum keys are generated locally on every new registration.
              </p>
            </div>

            <div className="space-y-4">
              <Field icon={<UserIcon className="w-4 h-4" />} label="Full Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder-slate-500"
                  placeholder="Your full name"
                />
              </Field>

              <Field icon={<Mail className="w-4 h-4" />} label="Email Address">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder-slate-500"
                  placeholder="you@organization.gov.in"
                />
              </Field>

              <Field icon={<Building2 className="w-4 h-4" />} label="Organization">
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder-slate-500"
                  placeholder="Your organization"
                />
              </Field>

              <Field icon={<Lock className="w-4 h-4" />} label="Password">
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="w-full bg-transparent text-sm outline-none placeholder-slate-500"
                    placeholder="••••••••"
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              {error && <p className="text-xs text-error-400">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleLogin}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleRegister}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-quantum-600 to-accent-600 text-sm font-medium hover:from-quantum-500 hover:to-accent-500 transition-all shadow-lg shadow-quantum-600/20 flex items-center justify-center gap-2"
                >
                  Register
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-success-400" />
                Protected by ML-KEM-768 + ML-DSA-65 (NIST FIPS 203/204)
              </div>
            </div>
          </div>
        )}

        {step === 'keygen' && (
          <div className="glass border border-white/10 rounded-2xl p-8 animate-slide-up shadow-2xl">
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-quantum-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-quantum-400 animate-spin" />
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-accent-400 animate-spin-slow" />
                <Atom className="absolute inset-0 m-auto w-8 h-8 text-quantum-300 animate-pulse" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold">Generating Post-Quantum Keys</h2>
              <p className="text-sm text-slate-400 mt-1">Establishing quantum-resistant identity</p>
            </div>

            <div className="space-y-3">
              {keygenPhases.map((phase, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-500 ${
                    phase.done
                      ? 'border-success-500/30 bg-success-500/5'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  {phase.done ? (
                    <CheckCircle2 className="w-5 h-5 text-success-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-quantum-400 animate-spin shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${phase.done ? 'text-success-200' : 'text-slate-200'}`}>
                      {phase.label}
                    </p>
                    <p className="text-xs text-slate-500">{phase.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="glass border border-white/10 rounded-2xl p-8 animate-slide-up shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-success-500/10 border border-success-500/30 flex items-center justify-center mb-4 animate-glow">
                <CheckCircle2 className="w-8 h-8 text-success-400" />
              </div>
              <h2 className="text-lg font-semibold">Quantum Identity Established</h2>
              <p className="text-sm text-slate-400 mt-1">
                Your post-quantum keys have been generated and registered with the Key Manager.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <KeyInfo icon={<KeyRound className="w-4 h-4" />} label="ML-KEM-768" value="Key pair ready" />
              <KeyInfo icon={<Fingerprint className="w-4 h-4" />} label="ML-DSA-65" value="Signature key ready" />
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="w-4 h-4 text-quantum-400" />
                  <span className="text-xs font-medium text-slate-300">Public Key Fingerprint</span>
                </div>
                <p className="font-mono text-xs text-quantum-300 break-all leading-relaxed">{fingerprint}</p>
              </div>
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-4 h-4 text-accent-400" />
                  <span className="text-xs font-medium text-slate-300">Key Preview (hex)</span>
                </div>
                <p className="font-mono text-xs text-accent-300/80 break-all leading-relaxed">{hexPreview}...</p>
              </div>
            </div>

            <button
              onClick={onAuthenticated}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-quantum-600 to-accent-600 text-sm font-medium hover:from-quantum-500 hover:to-accent-500 transition-all shadow-lg shadow-quantum-600/20 flex items-center justify-center gap-2"
            >
              Enter QuMail
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-6">
          Smart India Hackathon 2026 · Statement #120 · ISRO
        </p>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-400 mb-1.5 block">{label}</label>
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] focus-within:border-quantum-500/40 focus-within:bg-white/[0.05] transition-colors">
        <span className="text-slate-500">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function KeyInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-2">
        <span className="text-quantum-400">{icon}</span>
        <span className="text-xs font-medium text-slate-300">{label}</span>
      </div>
      <span className="text-xs text-success-300 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> {value}
      </span>
    </div>
  );
}
