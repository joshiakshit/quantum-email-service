import { Key, X, RefreshCw } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function KeyManagementModal({ onClose }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 520, borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} color="var(--color-accent)" strokeWidth={1.7} />
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 500 }}>Key management</div>
          </div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--color-neutral-500)', display: 'flex', padding: 4 }}>
            <X size={15} strokeWidth={2} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5fbf82', flex: 'none' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#5fbf82' }}>Registered with Key Manager</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-neutral-600)' }}>Last verified 3 min ago</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Client ID */}
            <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', border: '1px solid var(--color-divider)' }}>
              <div style={{ fontSize: 10, color: 'var(--color-neutral-500)', marginBottom: 4 }}>Client ID</div>
              <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 14, color: 'var(--color-text)', letterSpacing: '0.03em' }}>
                QM-CLI-7A2F-91BE-004D
              </div>
            </div>

            {/* KEM + DSA keys */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)' }}>
                <div style={{ fontSize: 10, color: 'var(--color-neutral-500)', marginBottom: 4 }}>KEM key (ML-KEM-768)</div>
                <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: 'var(--color-accent-300)', marginBottom: 6 }}>B4:7E:1A:9C:D0:33:F8:22</div>
                <div style={{ fontSize: 9, color: 'var(--color-neutral-600)' }}>Generated 2026-08-14 · Expires 2027-02-14</div>
              </div>
              <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)' }}>
                <div style={{ fontSize: 10, color: 'var(--color-neutral-500)', marginBottom: 4 }}>Signing key (ML-DSA-65)</div>
                <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: 'var(--color-accent-300)', marginBottom: 6 }}>2D:A9:6C:11:E7:F0:5B:84</div>
                <div style={{ fontSize: 9, color: 'var(--color-neutral-600)' }}>Generated 2026-08-14 · Expires 2027-02-14</div>
              </div>
            </div>

            {/* JWT Token */}
            <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', border: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--color-neutral-500)' }}>JWT Token</div>
                <span className="tag tag-accent" style={{ fontSize: 9, padding: '2px 6px' }}>Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--color-neutral-500)' }}>Expires</span>
                <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--color-neutral-300)' }}>2026-08-26 06:58 IST</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: 'var(--color-neutral-500)' }}>Issuer</span>
                <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--color-neutral-300)' }}>km.isro.gov.in</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Close</button>
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
