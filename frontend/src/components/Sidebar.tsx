import {
  Inbox, Send, FileEdit, Star, Archive, Trash2,
  Key, Settings, ShieldCheck, LogOut, Sun, Moon, Pencil,
} from 'lucide-react';
import { FOLDER_IDS, FOLDER_LABELS, LABELS } from '@/data';
import { getInitials } from '@/data';
import type { Email, AuthState } from '@/types';

const FOLDER_ICONS: Record<string, React.ReactNode> = {
  inbox: <Inbox size={18} />,
  sent: <Send size={18} />,
  drafts: <FileEdit size={18} />,
  starred: <Star size={18} />,
  archive: <Archive size={18} />,
  trash: <Trash2 size={18} />,
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
      borderRight: '1px solid var(--border)',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px 12px' }}>
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
      <div style={{ padding: '4px 12px 14px' }}>
        <button
          onClick={onOpenCompose}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 20px', cursor: 'pointer',
            background: 'var(--accent-bg)', color: 'var(--fg)',
            border: '1px solid var(--accent-border)',
            borderRadius: 'var(--radius-full)',
            fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
            transition: 'box-shadow 0.2s, background 0.15s',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.background = 'var(--accent-bg)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <Pencil size={16} color="var(--accent)" />
          Compose
        </button>
      </div>

      {/* Folders */}
      <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {FOLDER_IDS.map(fid => {
          const active = fid === activeFolder && !settingsOpen;
          const count = fid === 'inbox' ? unreadInbox : 0;
          return (
            <div
              key={fid}
              className={`sidebar-row ${active ? 'active' : ''}`}
              onClick={() => onSelectFolder(fid)}
              style={{ padding: '7px 12px', borderRadius: 'var(--radius-full)' }}
            >
              <span style={{
                display: 'flex', alignItems: 'center',
                color: active ? 'var(--accent)' : 'var(--fg-muted)',
              }}>
                {FOLDER_ICONS[fid]}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400 }}>{FOLDER_LABELS[fid]}</span>
              {count > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--fg-secondary)',
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
          fontSize: 11, letterSpacing: '0.04em',
          color: 'var(--fg-muted)', marginBottom: 8, fontWeight: 500,
        }}>
          Labels
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LABELS.map(l => (
            <div key={l.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '5px 12px', fontSize: 13, color: 'var(--fg-secondary)',
              cursor: 'pointer', borderRadius: 'var(--radius-full)',
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flex: 'none' }} />
              {l.name}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Bottom actions */}
      <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div className="sidebar-row" onClick={onOpenKeyPanel} style={{ fontSize: 13, borderRadius: 'var(--radius-full)' }}>
          <Key size={18} strokeWidth={1.7} />
          Key management
        </div>
        <div className="sidebar-row" onClick={onOpenSettings} style={{ fontSize: 13, borderRadius: 'var(--radius-full)' }}>
          <Settings size={18} strokeWidth={1.7} />
          Settings
        </div>
        <div className="sidebar-row" onClick={onToggleTheme} style={{ fontSize: 13, borderRadius: 'var(--radius-full)' }}>
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.7} /> : <Moon size={18} strokeWidth={1.7} />}
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
