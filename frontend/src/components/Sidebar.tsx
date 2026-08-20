import { useState } from 'react';
import {
  Inbox, Send, FileEdit, Star, Archive, Trash2, Pencil,
  ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Tag,
} from 'lucide-react';
import { PRIMARY_FOLDERS, MORE_FOLDERS, FOLDER_LABELS, LABELS } from '@/data';
import type { AuthState } from '@/types';

const FOLDER_ICONS: Record<string, React.ReactNode> = {
  inbox: <Inbox size={18} strokeWidth={1.8} />,
  sent: <Send size={18} strokeWidth={1.8} />,
  drafts: <FileEdit size={18} strokeWidth={1.8} />,
  starred: <Star size={18} strokeWidth={1.8} />,
  archive: <Archive size={18} strokeWidth={1.8} />,
  trash: <Trash2 size={18} strokeWidth={1.8} />,
};

interface Props {
  collapsed: boolean;
  width: number;
  activeFolder: string;
  activeLabel: string | null;
  settingsOpen: boolean;
  unreadCounts: Record<string, number>;
  refreshing: boolean;
  auth: AuthState;
  onToggleCollapsed: () => void;
  onSelectFolder: (id: string) => void;
  onSelectLabel: (name: string | null) => void;
  onOpenCompose: () => void;
  onRefresh: () => void;
}

export default function Sidebar({
  collapsed, width, activeFolder, activeLabel, settingsOpen, unreadCounts, refreshing, auth,
  onToggleCollapsed, onSelectFolder, onSelectLabel, onOpenCompose, onRefresh,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(true);

  function folderRow(fid: string) {
    const active = fid === activeFolder && !settingsOpen && !activeLabel;
    const count = unreadCounts[fid] ?? 0;
    return (
      <button
        key={fid}
        className={`nav-row ${active ? 'active' : ''}`}
        onClick={() => onSelectFolder(fid)}
        title={collapsed ? FOLDER_LABELS[fid] : undefined}
        style={collapsed ? { justifyContent: 'center', padding: 8 } : undefined}
      >
        <span className="nav-icon">{FOLDER_ICONS[fid]}</span>
        {!collapsed && (
          <>
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {FOLDER_LABELS[fid]}
            </span>
            {active && fid === 'inbox' && (
              <span
                className="icon-btn"
                onClick={e => { e.stopPropagation(); onRefresh(); }}
                title="Refresh"
              >
                <RefreshCw size={14} strokeWidth={2} className={refreshing ? 'spin' : undefined} />
              </span>
            )}
            {count > 0 && <span className="badge">{count}</span>}
          </>
        )}
      </button>
    );
  }

  return (
    <nav style={{
      width, flex: 'none', display: 'flex', flexDirection: 'column',
      padding: '0 8px 8px', transition: 'width 0.16s ease', overflow: 'hidden',
    }}>
      <div style={{ padding: '0 4px 12px' }}>
        <button
          className="btn btn-primary"
          onClick={onOpenCompose}
          title={collapsed ? 'New message' : undefined}
          style={{
            width: '100%', height: 44, gap: 8, fontSize: 14, fontWeight: 600,
            borderRadius: 'var(--radius-m)', boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Pencil size={16} strokeWidth={2} />
          {!collapsed && 'New message'}
        </button>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {PRIMARY_FOLDERS.map(folderRow)}

        <button
          className="nav-row"
          onClick={() => setMoreOpen(o => !o)}
          title={collapsed ? 'More folders' : undefined}
          style={collapsed ? { justifyContent: 'center', padding: 8 } : undefined}
        >
          <span className="nav-icon">
            {moreOpen ? <ChevronDown size={18} strokeWidth={1.8} /> : <ChevronRight size={18} strokeWidth={1.8} />}
          </span>
          {!collapsed && <span>More</span>}
        </button>
        {moreOpen && MORE_FOLDERS.map(folderRow)}

        {!collapsed && (
          <>
            <div style={{ height: 12 }} />
            <button className="nav-section" onClick={() => setLabelsOpen(o => !o)}>
              {labelsOpen ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
              Labels
            </button>
            {labelsOpen && LABELS.map(l => {
              const active = activeLabel === l.name;
              return (
                <button
                  key={l.name}
                  className={`nav-row ${active ? 'active' : ''}`}
                  onClick={() => onSelectLabel(active ? null : l.name)}
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  <span className="nav-icon" style={{ color: l.color }}>
                    <Tag size={16} strokeWidth={1.8} />
                  </span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.name}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {!collapsed && (
        <div style={{
          margin: '10px 4px 8px', padding: '12px 14px',
          borderRadius: 'var(--radius-l)', background: 'var(--bg-tertiary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
              animation: 'pulseSoft 2.4s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Quantum channel active</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 4 }}>
            ML-KEM-768 · ML-DSA-65
          </div>
          <div style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {auth.kem_fingerprint}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 4px', justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>QMail 1.0.0</span>}
        <button
          className="rail-btn"
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <ChevronsRight size={16} strokeWidth={2} /> : <ChevronsLeft size={16} strokeWidth={2} />}
        </button>
      </div>
    </nav>
  );
}
