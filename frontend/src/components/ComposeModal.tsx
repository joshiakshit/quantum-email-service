import { useState } from 'react';
import { X, Send, Lock, Minus, Maximize2, Minimize2, Trash2, GripVertical } from 'lucide-react';
import type { ComposeDraft } from '@/types';

interface Props {
  fromEmail: string;
  initial?: ComposeDraft;
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => Promise<void>;
}

export default function ComposeModal({ fromEmail, initial, onClose, onSend }: Props) {
  const [to, setTo] = useState(initial?.to ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  async function handleSend() {
    if (!to.trim() || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      await onSend(to.trim(), subject.trim() || '(no subject)', body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
      setSending(false);
    }
  }

  const frame: React.CSSProperties = minimized
    ? { right: 24, bottom: 0, width: 340, height: 46 }
    : maximized
      ? { inset: '40px 40px 0', width: 'auto', height: 'auto' }
      : { right: 24, bottom: 0, width: 660, height: 600 };

  const fieldRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 16px', borderBottom: '1px solid var(--border-subtle)', flex: 'none',
  };
  const fieldLabel: React.CSSProperties = { fontSize: 13, color: 'var(--fg-secondary)', width: 54, flex: 'none' };
  const fieldInput: React.CSSProperties = {
    border: 'none', background: 'transparent', borderRadius: 0,
    height: 44, padding: 0, fontSize: 14,
  };

  return (
    <div style={{
      position: 'fixed', zIndex: 30, ...frame,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)', borderBottom: 'none',
      borderRadius: 'var(--radius-l) var(--radius-l) 0 0',
      boxShadow: 'var(--shadow-overlay)',
      animation: 'slideUpPanel 0.18s ease-out',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flex: 'none',
        padding: '0 8px 0 12px', height: 46,
        background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)',
      }}>
        <GripVertical size={15} color="var(--fg-muted)" strokeWidth={1.8} />
        <div
          onClick={() => setMinimized(m => !m)}
          style={{ flex: 1, fontSize: 14, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
        >
          {subject.trim() || 'New message'}
        </div>
        <button className="icon-btn" title="Minimize" onClick={() => setMinimized(m => !m)}>
          <Minus size={15} strokeWidth={2} />
        </button>
        <button
          className="icon-btn"
          title={maximized ? 'Restore' : 'Maximize'}
          onClick={() => { setMaximized(m => !m); setMinimized(false); }}
        >
          {maximized ? <Minimize2 size={15} strokeWidth={2} /> : <Maximize2 size={15} strokeWidth={2} />}
        </button>
        <button className="icon-btn" title="Close" onClick={onClose}>
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {!minimized && (
        <>
          <div style={fieldRow}>
            <span style={fieldLabel}>From</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{fromEmail}</span>
          </div>

          <div style={fieldRow}>
            <span style={fieldLabel}>To</span>
            <input
              className="input"
              placeholder="Recipient email"
              value={to}
              onChange={e => setTo(e.target.value)}
              autoFocus
              style={fieldInput}
            />
          </div>

          <div style={fieldRow}>
            <span style={fieldLabel}>Subject</span>
            <input
              className="input"
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={fieldInput}
            />
          </div>

          <textarea
            className="input scrollbar-thin"
            placeholder="Write your message…"
            value={body}
            onChange={e => setBody(e.target.value)}
            style={{
              flex: 1, minHeight: 0, border: 'none', borderRadius: 0, resize: 'none',
              padding: '18px 16px', fontSize: 14, lineHeight: 1.7, background: 'transparent',
            }}
          />

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flex: 'none',
            padding: '12px 16px', borderTop: '1px solid var(--border)',
          }}>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || !to.trim() || !body.trim()}
              style={{ height: 40, padding: '0 22px', borderRadius: 'var(--radius-full)', fontSize: 14, gap: 8 }}
            >
              <Send size={15} strokeWidth={2} />
              {sending ? 'Encrypting…' : 'Send'}
            </button>
            <button className="btn btn-icon" title="Discard draft" onClick={onClose}>
              <Trash2 size={16} strokeWidth={1.8} />
            </button>
            {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
            <div style={{ flex: 1 }} />
            <span className="tag tag-green" style={{ gap: 6 }}>
              <Lock size={11} strokeWidth={2.6} />
              ML-KEM-768 + ML-DSA-65
            </span>
          </div>
        </>
      )}
    </div>
  );
}
