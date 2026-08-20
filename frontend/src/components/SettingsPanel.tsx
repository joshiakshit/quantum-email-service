import { ArrowLeft, Shield, User, Info } from 'lucide-react';
import { SETTINGS_TABS, getInitials } from '@/data';
import type { AuthState } from '@/types';

const TAB_ICONS: Record<string, React.ReactNode> = {
  security: <Shield size={15} strokeWidth={1.7} />,
  account: <User size={15} strokeWidth={1.7} />,
  privacy: <Info size={15} strokeWidth={1.7} />,
};

interface Props {
  auth: AuthState;
  activeTab: string;
  onTabChange: (id: string) => void;
  onClose: () => void;
}

export default function SettingsPanel({ auth, activeTab, onTabChange, onClose }: Props) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-secondary)', minWidth: 0, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 52, flex: 'none', display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 24px', borderBottom: '1px solid var(--border)',
      }}>
        <div
          onClick={onClose}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--fg-muted)' }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </div>
        <h4 style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>Settings</h4>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Tab sidebar */}
        <div style={{
          width: 200, flex: 'none', borderRight: '1px solid var(--border)',
          padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {SETTINGS_TABS.map(tab => {
            const active = tab.id === activeTab;
            return (
              <div
                key={tab.id}
                className={`sidebar-row ${active ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                <span style={{
                  display: 'flex', alignItems: 'center',
                  color: active ? 'var(--accent)' : 'var(--fg-muted)',
                }}>
                  {TAB_ICONS[tab.id]}
                </span>
                <span>{tab.label}</span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'account' && <AccountTab auth={auth} />}
          {activeTab === 'privacy' && <PrivacyTab />}
        </div>
      </div>
    </div>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: 18, borderRadius: 'var(--radius-m)',
      border: '1px solid var(--border)', background: 'var(--bg)',
    }}>
      {children}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`toggle ${on ? 'on' : 'off'}`}>
      <div className="toggle-dot" />
    </div>
  );
}

function ToggleRow({ title, desc, on }: { title: string; desc: string; on: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{title}</div>
        <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{desc}</div>
      </div>
      <Toggle on={on} />
    </div>
  );
}

function SecurityTab() {
  return (
    <>
      <h4 style={{ fontSize: 18, margin: '0 0 4px', fontWeight: 600 }}>
        Encryption &amp; Security
      </h4>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 24px' }}>
        Manage post-quantum cryptographic settings and key exchange protocols.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SettingCard>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Default encryption</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                Applied to all outgoing messages
              </div>
            </div>
            <span className="tag tag-accent" style={{ fontSize: 10 }}>PQC Enabled</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{
              padding: 12, borderRadius: 'var(--radius-s)',
              background: 'var(--bg-secondary)', border: '1px solid var(--accent-border)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 4 }}>Key Encapsulation</div>
              <div style={{
                fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)',
                color: 'var(--accent-fg)',
              }}>ML-KEM-768</div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 2 }}>
                NIST FIPS 203 · 192-bit security
              </div>
            </div>
            <div style={{
              padding: 12, borderRadius: 'var(--radius-s)',
              background: 'var(--bg-secondary)', border: '1px solid var(--accent-border)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 4 }}>Digital Signature</div>
              <div style={{
                fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)',
                color: 'var(--accent-fg)',
              }}>ML-DSA-65</div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 2 }}>
                NIST FIPS 204 · Category 3
              </div>
            </div>
          </div>
        </SettingCard>

        <SettingCard>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Quantum entropy source</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flex: 'none' }} />
            <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>QRNG hardware module — connected</span>
            <span style={{
              fontSize: 10, color: 'var(--fg-muted)', marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
            }}>QRNG-HW-v2.4</span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 11, color: 'var(--fg-muted)' }}>
            <div>Entropy rate: <span style={{ color: 'var(--fg-secondary)' }}>256 kbps</span></div>
            <div>Pool health: <span style={{ color: 'var(--green)' }}>Excellent</span></div>
            <div>Last reseed: <span style={{ color: 'var(--fg-secondary)' }}>12 min ago</span></div>
          </div>
        </SettingCard>

        <SettingCard>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Key exchange protocol</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Handshake', 'Hybrid PQ/Classical (X25519 + ML-KEM)'],
              ['Forward secrecy', 'Enabled — ratchet every 100 messages', 'var(--green)'],
              ['Fallback', 'AES-256-GCM if PQ unavailable'],
              ['Zero-knowledge proof', 'Enabled for auth headers'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
                <span style={{ color: color ?? 'var(--fg-secondary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </SettingCard>

        <SettingCard>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Auto-sign &amp; verification</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ToggleRow title="Sign all outgoing messages" desc="Attach ML-DSA-65 signature to every sent email" on={true} />
            <ToggleRow title="Verify incoming signatures" desc="Reject messages with invalid or missing signatures" on={true} />
            <ToggleRow title="Require PQC for classified labels" desc="Block sending classified mail without quantum encryption" on={true} />
          </div>
        </SettingCard>
      </div>
    </>
  );
}

function AccountTab({ auth }: { auth: AuthState }) {
  const initials = getInitials(auth.name);

  return (
    <>
      <h4 style={{ fontSize: 18, margin: '0 0 4px', fontWeight: 600 }}>Account</h4>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 24px' }}>
        Your identity and key information.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SettingCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 600, color: 'var(--accent)', flex: 'none',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{auth.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{auth.email}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Client ID', auth.client_id, true],
              ['KEM fingerprint', auth.kem_fingerprint, true],
              ['Signing fingerprint', auth.signing_fingerprint, true],
              ['Key algorithm', 'ML-KEM-768 + ML-DSA-65', false],
            ].map(([label, value, mono]) => (
              <div key={label as string} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-s)',
                background: 'var(--bg-secondary)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{
                  fontSize: 12, color: 'var(--fg-secondary)',
                  fontFamily: mono ? 'var(--font-mono)' : undefined,
                  wordBreak: 'break-all',
                }}>{value}</div>
              </div>
            ))}
          </div>
        </SettingCard>
      </div>
    </>
  );
}

function PrivacyTab() {
  return (
    <>
      <h4 style={{ fontSize: 18, margin: '0 0 4px', fontWeight: 600 }}>Privacy</h4>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 24px' }}>
        Control data retention, metadata stripping, and logging.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SettingCard>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Metadata protection</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ToggleRow title="Strip message headers" desc="Remove X-headers and routing metadata before sending" on={true} />
            <ToggleRow title="Block remote content" desc="Prevent tracking pixels and external image loads" on={true} />
            <ToggleRow title="Auto-expire messages" desc="Classified messages auto-delete after 90 days" on={false} />
          </div>
        </SettingCard>

        <SettingCard>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Audit log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['Today 09:42', 'Decrypted message from ananya.rao@isro.gov.in'],
              ['Today 08:15', 'Verified ML-DSA-65 sig — missioncontrol@vssc.isro.gov.in'],
              ['Yesterday', 'Key rotation reminder acknowledged'],
            ].map(([time, desc], i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '6px 0',
                  borderBottom: i < 2 ? '1px solid var(--border)' : undefined,
                }}
              >
                <span style={{ color: 'var(--fg-muted)' }}>{time}</span>
                <span style={{ color: 'var(--fg-secondary)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </SettingCard>
      </div>
    </>
  );
}
