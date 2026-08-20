import {
  Inbox, Send, FileEdit, Star, Archive, Trash2,
  Key, Settings, ShieldCheck, Plus, LogOut, Sun, Moon,
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
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSelectFolder: (id: string) => void;
  onOpenCompose: () => void;
  onOpenKeyPanel: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  activeFolder, settingsOpen, emails, auth, theme,
  onToggleTheme, onSelectFolder, onOpenCompose, onOpenKeyPanel, onOpenSettings, onLogout,
}: Props) {
  const unreadInbox = emails.filter(e => e.folder === 'inbox' && e.unread).length;
  const initials = getInitials(auth.name);

  return (
    <div style={{
      width: 240, flex: 'none', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 18px 14px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius-m)',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={18} color="#fff" strokeWidth={1.8} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em', lineHeight: 1 }}>
            QMail
          </div>
          <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', marginTop: 2, fontWeight: 500 }}>
            QUANTUM SECURE
          </div>
        </div>
      </div>

      {/* Compose */}
      <div style={{ padding: '0 12px 10px' }}>
        <button
          className="btn btn-primary"
          onClick={onOpenCompose}
          style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '10px 0', height: 38 }}
        >
          <Plus size={14} />
          New message
        </button>
      </div>

      {/* Folders */}
      <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {FOLDER_IDS.map(fid => {
          const active = fid === activeFolder && !settingsOpen;
          const count = fid === 'inbox' ? unreadInbox : 0;
          return (
            <div
              key={fid}
              className={`sidebar-row ${active ? 'active' : ''}`}
              onClick={() => onSelectFolder(fid)}
            >
              <span style={{
                display: 'flex', alignItems: 'center',
                color: active ? 'var(--accent)' : 'var(--fg-muted)',
              }}>
                {FOLDER_ICONS[fid]}
              </span>
              <span style={{ flex: 1 }}>{FOLDER_LABELS[fid]}</span>
              {count > 0 && (
                <span style={{
                  fontSize: 10, minWidth: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--accent-bg)', color: 'var(--accent)',
                  borderRadius: 'var(--radius-full)', padding: '0 5px',
                  fontWeight: 600,
                }}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div style={{ padding: '16px 18px 6px' }}>
        <div style={{
          fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--fg-muted)', marginBottom: 8, fontWeight: 500,
        }}>
          Labels
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LABELS.map(l => (
            <div key={l.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 6px', fontSize: 12, color: 'var(--fg-secondary)',
              cursor: 'pointer', borderRadius: 'var(--radius-s)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, flex: 'none' }} />
              {l.name}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Encryption status */}
      <div style={{
        margin: '0 10px 8px', padding: 12, borderRadius: 'var(--radius-m)',
        background: 'var(--green-bg)', border: '1px solid var(--green-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
            flex: 'none', animation: 'pulseGlow 3s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--green)' }}>Quantum channel active</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[['KEM', 'ML-KEM-768'], ['DSA', 'ML-DSA-65'], ['Entropy', 'QRNG seeded']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
              <span style={{ color: 'var(--fg-muted)' }}>{k}</span>
              <span style={{ color: 'var(--fg-secondary)', fontFamily: 'var(--font-mono)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div className="sidebar-row" onClick={onOpenKeyPanel} style={{ fontSize: 12 }}>
          <Key size={14} strokeWidth={1.7} />
          Key management
        </div>
        <div className="sidebar-row" onClick={onOpenSettings} style={{ fontSize: 12 }}>
          <Settings size={14} strokeWidth={1.7} />
          Settings
        </div>
        <div className="sidebar-row" onClick={onToggleTheme} style={{ fontSize: 12 }}>
          {theme === 'dark' ? <Sun size={14} strokeWidth={1.7} /> : <Moon size={14} strokeWidth={1.7} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </div>
      </div>

      {/* Account */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, color: 'var(--accent)', flex: 'none',
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 12, fontWeight: 500, color: 'var(--fg)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {auth.name}
          </div>
          <div style={{
            fontSize: 10, color: 'var(--fg-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {auth.email}
          </div>
        </div>
        <div
          onClick={onLogout}
          title="Sign out"
          style={{
            cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex',
            padding: 4, borderRadius: 4, flex: 'none',
          }}
        >
          <LogOut size={14} strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}
