import {
  Inbox, Send, FileEdit, Star, Archive, Trash2,
  Key, Settings, ShieldCheck, Plus,
} from 'lucide-react';
import { FOLDER_IDS, FOLDER_LABELS, LABELS } from '@/data';
import { getInitials } from '@/data';
import type { Email, AuthState } from '@/types';

const FOLDER_ICONS: Record<string, React.ReactNode> = {
  inbox: <Inbox size={15} />,
  sent: <Send size={15} />,
  drafts: <FileEdit size={15} />,
  starred: <Star size={15} />,
  archive: <Archive size={15} />,
  trash: <Trash2 size={15} />,
};

interface Props {
  activeFolder: string;
  settingsOpen: boolean;
  emails: Email[];
  auth: AuthState;
  onSelectFolder: (id: string) => void;
  onOpenCompose: () => void;
  onOpenKeyPanel: () => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  activeFolder, settingsOpen, emails, auth,
  onSelectFolder, onOpenCompose, onOpenKeyPanel, onOpenSettings,
}: Props) {
  const unreadInbox = emails.filter(e => e.folder === 'inbox' && e.unread).length;
  const initials = getInitials(auth.name);

  return (
    <div
      style={{
        width: 232,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #1a1538 0%, var(--color-bg) 100%)',
        borderRight: '1px solid color-mix(in srgb, var(--color-accent) 12%, transparent)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 14px' }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-accent-700), var(--color-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ShieldCheck size={18} color="#fff" strokeWidth={1.8} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em', lineHeight: 1 }}>
            QMail
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-accent-400)', letterSpacing: '0.06em', marginTop: 2 }}>
            QUANTUM SECURE
          </div>
        </div>
      </div>

      {/* Compose button */}
      <div style={{ padding: '0 14px 10px' }}>
        <button
          className="btn btn-primary"
          onClick={onOpenCompose}
          style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 'var(--radius-md)' }}
        >
          <Plus size={14} />
          New message
        </button>
      </div>

      {/* Folder list */}
      <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {FOLDER_IDS.map(fid => {
          const active = fid === activeFolder && !settingsOpen;
          const count = fid === 'inbox' ? unreadInbox : 0;
          return (
            <div
              key={fid}
              className={`sidebar-row ${active ? 'active' : ''}`}
              onClick={() => onSelectFolder(fid)}
              style={{ color: active ? 'var(--color-accent-300)' : 'var(--color-neutral-400)' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', color: active ? 'var(--color-accent)' : 'var(--color-neutral-500)' }}>
                {FOLDER_ICONS[fid]}
              </span>
              <span style={{ flex: 1, fontSize: 13 }}>{FOLDER_LABELS[fid]}</span>
              {count > 0 && (
                <span
                  style={{
                    fontSize: 10, minWidth: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--color-accent-800)', color: 'var(--color-accent-200)',
                    borderRadius: 9, padding: '0 5px',
                  }}
                >
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div style={{ padding: '16px 20px 6px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 8 }}>
          Labels
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {LABELS.map(l => (
            <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', fontSize: 12, color: 'var(--color-neutral-400)', cursor: 'pointer' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, flex: 'none' }} />
              {l.name}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Encryption status card */}
      <div
        style={{
          margin: '0 12px 8px', padding: 12, borderRadius: 'var(--radius-md)',
          background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5fbf82', flex: 'none', animation: 'pulseGlow 3s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: '#5fbf82' }}>Quantum channel active</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            ['KEM', 'ML-KEM-768'],
            ['DSA', 'ML-DSA-65'],
            ['Entropy', 'QRNG seeded'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
              <span style={{ color: 'var(--color-neutral-500)' }}>{k}</span>
              <span style={{ color: 'var(--color-neutral-300)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key management & Settings */}
      <div style={{ padding: '6px 10px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div className="sidebar-row" onClick={onOpenKeyPanel} style={{ color: 'var(--color-neutral-400)', fontSize: 12 }}>
          <Key size={14} strokeWidth={1.7} />
          Key management
        </div>
        <div className="sidebar-row" onClick={onOpenSettings} style={{ color: 'var(--color-neutral-400)', fontSize: 12 }}>
          <Settings size={14} strokeWidth={1.7} />
          Settings
        </div>
      </div>

      {/* Account */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--color-accent-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: 'var(--color-accent-200)', flex: 'none',
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-neutral-200)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {auth.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-neutral-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {auth.email}
          </div>
        </div>
      </div>
    </div>
  );
}
