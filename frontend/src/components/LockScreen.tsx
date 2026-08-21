import { useEffect, useState } from 'react';
import { Lock, Loader2, ArrowRight, LogOut } from 'lucide-react';
import * as api from '@/api';
import * as session from '@/session';
import type { AuthState } from '@/types';

interface Props {
  auth: AuthState;
  onUnlocked: (auth: AuthState) => void;
  onLogout: () => void;
}

// Shown after a reload: the vault ciphertext survives in IndexedDB but the
// unlocked keys were in memory and are gone. Re-derive them from the passphrase.
export default function LockScreen({ auth, onUnlocked, onLogout }: Props) {
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasVault, setHasVault] = useState<boolean | null>(null);

  useEffect(() => {
    session.hasVault().then(setHasVault);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passphrase) return;
    setLoading(true);
    setError('');
    try {
      if (hasVault) {
        await session.unlock(passphrase);
        onUnlocked(auth);
      } else if (auth.keys_registered) {
        // New device: pull the synced vault, then unlock it locally.
        let blob;
        try {
          blob = await api.getVault();
        } catch {
          throw new Error('No synced vault was found for this account.');
        }
        await session.installVaultBlob(blob);
        await session.unlock(passphrase);
        onUnlocked(auth);
      } else {
        const pub = await session.provision(passphrase);
        const reg = await api.registerKeys(pub);
        const blob = await session.getVaultBlob();
        if (blob) await api.putVault(blob);
        onUnlocked({
          ...auth,
          client_id: reg.client_id,
          keys_registered: true,
          kem_fingerprint: reg.kem_fingerprint,
          signing_fingerprint: reg.signing_fingerprint,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(/operation-specific reason|OperationError/i.test(message) ? 'Incorrect passphrase' : message);
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        width: '100%', maxWidth: 380, padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--radius-l)',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <Lock size={24} color="var(--accent)" strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Unlock your mailbox
        </div>
        <div style={{
          fontSize: 13, color: 'var(--fg-secondary)', marginTop: 6, marginBottom: 24,
          textAlign: 'center', lineHeight: 1.6,
        }}>
          {auth.email}
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-m)',
              background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13,
              border: '1px solid rgba(239, 68, 68, 0.15)',
            }}>
              {error}
            </div>
          )}
          <input
            className="input"
            type="password"
            value={passphrase}
            onChange={e => { setPassphrase(e.target.value); setError(''); }}
            placeholder="Encryption passphrase"
            autoComplete="current-password"
            autoFocus
          />
          <button type="submit" disabled={loading || hasVault === null} className="btn btn-primary"
            style={{ height: 44, fontSize: 14, fontWeight: 500, gap: 8 }}>
            {loading ? <><Loader2 size={16} className="spin" />Unlocking...</> : <>Unlock<ArrowRight size={16} /></>}
          </button>
        </form>

        <button type="button" onClick={onLogout} style={{
          marginTop: 20, background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--fg-muted)', fontSize: 13, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  );
}
