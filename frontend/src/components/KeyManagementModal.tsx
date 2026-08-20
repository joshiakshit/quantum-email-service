import { Key, X, RefreshCw } from 'lucide-react';
import type { AuthState } from '@/types';

interface Props {
  auth: AuthState;
  onClose: () => void;
}

export default function KeyManagementModal({ auth, onClose }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.15s ease-out',
    }}>
      <div style={{
        width: 520, borderRadius: 'var(--radius-l)',
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-overlay)', overflow: 'hidden',
        animation: 'scaleIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} color="var(--accent)" strokeWidth={1.7} />
            <div style={{ fontSize: 15, fontWeight: 500 }}>Key management</div>
          </div>
          <div
            onClick={onClose}
            style={{ cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', padding: 4, borderRadius: 4 }}
          >
            <X size={15} strokeWidth={2} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flex: 'none',
            }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--green)' }}>
              Registered with Key Manager
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-muted)' }}>Session active</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Client ID */}
            <div style={{
              padding: 14, borderRadius: 'var(--radius-m)',
              background: 'var(--bg)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 4 }}>Client ID</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg)',
                letterSpacing: '0.03em',
              }}>
                {auth.client_id}
              </div>
            </div>

            {/* KEM + DSA keys */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{
                padding: 14, borderRadius: 'var(--radius-m)',
                background: 'var(--bg)', border: '1px solid var(--accent-border)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 4 }}>KEM key (ML-KEM-768)</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--accent-fg)', marginBottom: 6,
                }}>
                  {auth.kem_fingerprint}
                </div>
                <div style={{ fontSize: 9, color: 'var(--fg-muted)' }}>NIST FIPS 203 · 192-bit security</div>
              </div>
              <div style={{
                padding: 14, borderRadius: 'var(--radius-m)',
                background: 'var(--bg)', border: '1px solid var(--accent-border)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 4 }}>Signing key (ML-DSA-65)</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--accent-fg)', marginBottom: 6,
                }}>
                  {auth.signing_fingerprint}
                </div>
                <div style={{ fontSize: 9, color: 'var(--fg-muted)' }}>NIST FIPS 204 · Category 3</div>
              </div>
            </div>

            {/* JWT Token */}
            <div style={{
              padding: 14, borderRadius: 'var(--radius-m)',
              background: 'var(--bg)', border: '1px solid var(--border)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
              }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>JWT Token</div>
                <span className="tag tag-accent" style={{ fontSize: 9, padding: '2px 6px' }}>Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--fg-muted)' }}>Identity</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)' }}>{auth.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: 'var(--fg-muted)' }}>Issuer</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)' }}>QMail Key Manager</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
              Close
            </button>
            <button className="btn btn-primary" onClick={onClose} style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
              <RefreshCw size={13} strokeWidth={2} />
              Regenerate keys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
