import { useEffect, useRef, useState } from 'react';
import { Search, Settings, ShieldCheck, Key, LogOut, Sun, Moon, X } from 'lucide-react';
import { getInitials } from '@/data';
import type { AuthState } from '@/types';

interface Props {
  auth: AuthState;
  search: string;
  brandWidth: number;
  theme: 'dark' | 'light';
  onSearchChange: (q: string) => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenKeyPanel: () => void;
  onLogout: () => void;
}

export default function TopBar({
  auth, search, brandWidth, theme,
  onSearchChange, onToggleTheme, onOpenSettings, onOpenKeyPanel, onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  return (
    <header style={{
      height: 'var(--topbar-h)', flex: 'none',
      display: 'flex', alignItems: 'center', gap: 16, paddingRight: 12,
    }}>
      <div style={{
        width: brandWidth, flex: 'none', display: 'flex', alignItems: 'center', gap: 10,
        paddingLeft: 16, transition: 'width 0.16s ease',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 'var(--radius-m)', flex: 'none',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={17} color="#fff" strokeWidth={2} />
        </div>
        {brandWidth > 120 && (
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            QMail
          </div>
        )}
      </div>

      <div style={{ position: 'relative', flex: '3 1 260px', maxWidth: 660 }}>
        <Search
          size={16}
          color="var(--fg-muted)"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          className="input"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search messages"
          style={{
            height: 42, paddingLeft: 40, paddingRight: search ? 36 : 12,
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-tertiary)', border: '1px solid transparent',
          }}
        />
        {search && (
          <button
            className="icon-btn"
            onClick={() => onSearchChange('')}
            title="Clear search"
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <button
        className="btn"
        onClick={onOpenKeyPanel}
        style={{
          height: 40, gap: 8, borderRadius: 'var(--radius-full)',
          borderColor: 'var(--accent-border)', color: 'var(--accent-fg)', fontWeight: 600,
        }}
      >
        <ShieldCheck size={15} strokeWidth={2} />
        Quantum secure
      </button>

      <button className="btn btn-icon" title="Settings" onClick={onOpenSettings}>
        <Settings size={18} strokeWidth={1.8} />
      </button>

      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 4px 10px',
            background: 'transparent', border: 'none', borderRadius: 'var(--radius-m)',
            cursor: 'pointer', color: 'var(--fg)',
          }}
        >
          <div style={{ textAlign: 'right', lineHeight: 1.25, maxWidth: 220 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {auth.name}
            </div>
            <div style={{
              fontSize: 12, color: 'var(--fg-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {auth.email}
            </div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: 'var(--radius-m)', flex: 'none',
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, color: 'var(--accent-fg)',
          }}>
            {getInitials(auth.name)}
          </div>
        </button>

        {menuOpen && (
          <div className="menu" style={{ right: 0, top: 46, minWidth: 280 }}>
            <div style={{ padding: '14px 12px 12px', textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-l)', margin: '0 auto 10px',
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 600, color: 'var(--accent-fg)',
              }}>
                {getInitials(auth.name)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{auth.name}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 10 }}>{auth.email}</div>
              <span className="tag tag-green" style={{ gap: 5 }}>
                <ShieldCheck size={11} strokeWidth={2.4} />
                ML-KEM-768 · ML-DSA-65
              </span>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />

            <button className="menu-item" onClick={() => { setMenuOpen(false); onOpenKeyPanel(); }}>
              <Key size={15} strokeWidth={1.8} />
              Key management
            </button>
            <button className="menu-item" onClick={() => { setMenuOpen(false); onOpenSettings(); }}>
              <Settings size={15} strokeWidth={1.8} />
              Settings
            </button>
            <button className="menu-item" onClick={onToggleTheme}>
              {theme === 'dark' ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>

            <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />

            <button className="menu-item" onClick={() => { setMenuOpen(false); onLogout(); }} style={{ color: 'var(--red)' }}>
              <LogOut size={15} strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
