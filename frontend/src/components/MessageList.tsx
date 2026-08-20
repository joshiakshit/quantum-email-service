import { useEffect, useRef, useState } from 'react';
import {
  Check, Star, Lock, Unlock, Inbox, ChevronDown, ChevronLeft, ChevronRight,
  MoreHorizontal, SlidersHorizontal, MailOpen, Mail, ShieldCheck, ShieldAlert, RefreshCw,
} from 'lucide-react';
import { AVATARS, CATEGORIES, getInitials } from '@/data';
import type { Email } from '@/types';

const PAGE_SIZE = 50;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  primary: <Inbox size={15} strokeWidth={1.8} />,
  encrypted: <ShieldCheck size={15} strokeWidth={1.8} />,
  unverified: <ShieldAlert size={15} strokeWidth={1.8} />,
};

interface Props {
  folderLabel: string;
  emails: Email[];
  category: string;
  unreadOnly: boolean;
  selected: Set<number>;
  starred: Set<number>;
  refreshing: boolean;
  isUnread: (email: Email) => boolean;
  onCategoryChange: (id: string) => void;
  onToggleUnreadOnly: () => void;
  onToggleSelect: (id: number) => void;
  onSelectMany: (ids: number[], on: boolean) => void;
  onToggleStar: (id: number) => void;
  onOpen: (id: number) => void;
  onMarkRead: (ids: number[], read: boolean) => void;
  onRefresh: () => void;
}

export default function MessageList({
  folderLabel, emails, category, unreadOnly, selected, starred, refreshing, isUnread,
  onCategoryChange, onToggleUnreadOnly, onToggleSelect, onSelectMany, onToggleStar,
  onOpen, onMarkRead, onRefresh,
}: Props) {
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<'none' | 'filter' | 'more'>('none');
  const menuRef = useRef<HTMLDivElement>(null);

  const visible = emails.filter(e => {
    if (unreadOnly && !isUnread(e)) return false;
    if (category === 'encrypted') return e.encrypted;
    if (category === 'unverified') return !e.encrypted;
    return true;
  });

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageItems = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const pageIds = pageItems.map(e => e.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const selectedIds = [...selected];

  useEffect(() => {
    if (menu === 'none') return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenu('none');
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menu]);

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', flex: 'none',
      }}>
        <button
          className={`checkbox ${allChecked ? 'checked' : ''}`}
          onClick={() => onSelectMany(pageIds, !allChecked)}
          title={allChecked ? 'Deselect all' : 'Select all'}
        >
          {allChecked && <Check size={12} strokeWidth={3} />}
        </button>
        <ChevronDown size={14} strokeWidth={2} color="var(--fg-muted)" />

        <h1 style={{ margin: '0 0 0 6px', fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {folderLabel}
        </h1>

        <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="icon-btn"
            title="More options"
            onClick={() => setMenu(m => (m === 'more' ? 'none' : 'more'))}
          >
            <MoreHorizontal size={18} strokeWidth={2} />
          </button>

          {menu === 'more' && (
            <div className="menu" style={{ left: 0, top: 34 }}>
              <button
                className="menu-item"
                onClick={() => { onMarkRead(selectedIds.length ? selectedIds : pageIds, true); setMenu('none'); }}
              >
                <MailOpen size={15} strokeWidth={1.8} />
                Mark as read
              </button>
              <button
                className="menu-item"
                onClick={() => { onMarkRead(selectedIds.length ? selectedIds : pageIds, false); setMenu('none'); }}
              >
                <Mail size={15} strokeWidth={1.8} />
                Mark as unread
              </button>
              <button className="menu-item" onClick={() => { onRefresh(); setMenu('none'); }}>
                <RefreshCw size={15} strokeWidth={1.8} className={refreshing ? 'spin' : undefined} />
                Refresh
              </button>
            </div>
          )}

          {menu === 'filter' && (
            <div className="menu" style={{ right: 0, top: 34, left: 'auto' }}>
              <button className="menu-item" onClick={() => { onCategoryChange('primary'); setMenu('none'); }}>
                <Inbox size={15} strokeWidth={1.8} />
                All messages
              </button>
              <button className="menu-item" onClick={() => { onCategoryChange('encrypted'); setMenu('none'); }}>
                <ShieldCheck size={15} strokeWidth={1.8} />
                Encrypted only
              </button>
              <button className="menu-item" onClick={() => { onCategoryChange('unverified'); setMenu('none'); }}>
                <ShieldAlert size={15} strokeWidth={1.8} />
                Unverified only
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {selectedIds.length > 0 && (
          <>
            <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{selectedIds.length} selected</span>
            <button className="btn" onClick={() => onMarkRead(selectedIds, true)} style={{ height: 32 }}>
              <MailOpen size={14} strokeWidth={1.8} />
              Read
            </button>
            <button className="btn" onClick={() => onMarkRead(selectedIds, false)} style={{ height: 32 }}>
              <Mail size={14} strokeWidth={1.8} />
              Unread
            </button>
          </>
        )}

        <button
          className="btn"
          onClick={onToggleUnreadOnly}
          style={{
            height: 32, borderRadius: 'var(--radius-full)',
            background: unreadOnly ? 'var(--accent-bg)' : 'transparent',
            borderColor: unreadOnly ? 'var(--accent-border)' : 'var(--border)',
            color: unreadOnly ? 'var(--accent-fg)' : 'var(--fg)',
          }}
        >
          Unread
        </button>

        <button
          className="btn"
          onClick={() => setMenu(m => (m === 'filter' ? 'none' : 'filter'))}
          style={{ height: 32, borderRadius: 'var(--radius-full)' }}
        >
          <SlidersHorizontal size={13} strokeWidth={2} />
          Filter
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4 }}>
          <button className="btn btn-icon" disabled={current <= 1} onClick={() => setPage(current - 1)} title="Newer">
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--fg-secondary)', minWidth: 28, textAlign: 'center' }}>
            {current}/{pages}
          </span>
          <button className="btn btn-icon" disabled={current >= pages} onClick={() => setPage(current + 1)} title="Older">
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', flex: 'none',
        borderBottom: '1px solid var(--border)', padding: '0 4px', overflowX: 'auto',
      }}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`tab ${category === c.id ? 'active' : ''}`}
            onClick={() => onCategoryChange(c.id)}
          >
            {CATEGORY_ICONS[c.id]}
            {c.label}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto' }}>
        {pageItems.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40,
          }}>
            <Inbox size={34} color="var(--fg-faint)" strokeWidth={1.3} />
            <div style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
              {unreadOnly ? 'No unread messages' : 'No messages here'}
            </div>
          </div>
        ) : pageItems.map(email => {
          const unread = isUnread(email);
          const checked = selected.has(email.id);
          const av = AVATARS[email.avatarIdx % AVATARS.length];
          return (
            <div
              key={email.id}
              className={`msg-row ${unread ? 'unread' : ''} ${checked ? 'checked selected' : ''}`}
              onClick={() => onOpen(email.id)}
            >
              <div style={{ width: 34, height: 34, flex: 'none' }}>
                <div
                  className="row-avatar"
                  style={{
                    width: 34, height: 34, borderRadius: 'var(--radius-m)', background: av.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: av.color,
                  }}
                >
                  {getInitials(email.sender)}
                </div>
                <button
                  className={`checkbox row-check ${checked ? 'checked' : ''}`}
                  onClick={e => { e.stopPropagation(); onToggleSelect(email.id); }}
                  title="Select"
                  style={{ width: 34, height: 34, borderRadius: 'var(--radius-m)' }}
                >
                  {checked && <Check size={14} strokeWidth={3} />}
                </button>
              </div>

              <button
                className={`icon-btn ${starred.has(email.id) ? 'starred' : ''}`}
                onClick={e => { e.stopPropagation(); onToggleStar(email.id); }}
                title={starred.has(email.id) ? 'Unstar' : 'Star'}
              >
                <Star size={16} strokeWidth={1.8} fill={starred.has(email.id) ? 'currentColor' : 'none'} />
              </button>

              <div style={{
                width: 170, flex: 'none', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
              }}>
                <span style={{
                  fontSize: 14, fontWeight: unread ? 700 : 500, color: 'var(--fg)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {email.sender}
                </span>
                {email.label && (
                  <span style={{
                    flex: 'none', fontSize: 10, fontWeight: 600, padding: '2px 6px',
                    borderRadius: 'var(--radius-s)',
                    background: email.labelBg || 'var(--accent-bg)',
                    color: email.labelColor || 'var(--accent-fg)',
                  }}>
                    {email.label}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontSize: 14, fontWeight: unread ? 700 : 400, color: 'var(--fg)' }}>
                  {email.subject}
                </span>
                <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}> — {email.preview}</span>
              </div>

              <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
                {email.encrypted
                  ? <Lock size={14} color="var(--green)" strokeWidth={2.2} />
                  : <Unlock size={14} color="var(--fg-muted)" strokeWidth={2.2} />}
                <span style={{
                  fontSize: 12, color: unread ? 'var(--fg)' : 'var(--fg-muted)',
                  fontWeight: unread ? 600 : 400, minWidth: 62, textAlign: 'right',
                }}>
                  {email.time}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
