import { useState } from 'react';
import { Plus, X, Send, Paperclip, Lock } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => Promise<void>;
}

export default function ComposeModal({ onClose, onSend }: Props) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    if (!to.trim() || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      await onSend(to.trim(), subject.trim() || '(no subject)', body);
    } catch (e: any) {
      setError(e.message || 'Send failed');
      setSending(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.15s ease-out',
    }}>
      <div style={{
        width: 720, borderRadius: 'var(--radius-l)',
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-overlay)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'scaleIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} color="var(--accent)" strokeWidth={1.8} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>New message</div>
          </div>
          <div
            onClick={onClose}
            style={{ cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', padding: 4, borderRadius: 4 }}
          >
            <X size={15} strokeWidth={2} />
          </div>
        </div>

        {/* To / Subject */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <input
            className="input"
            placeholder="To (recipient email)"
            value={to}
            onChange={e => setTo(e.target.value)}
            style={{
              border: 'none', borderBottom: '1px solid var(--border)',
              borderRadius: 0, padding: '10px 20px', fontSize: 13,
              background: 'transparent',
            }}
          />
          <input
            className="input"
            placeholder="Subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            style={{
              border: 'none', borderBottom: '1px solid var(--border)',
              borderRadius: 0, padding: '10px 20px', fontSize: 13,
              background: 'transparent',
            }}
          />
        </div>

        {/* Body */}
        <textarea
          className="input"
          placeholder="Write your message..."
          value={body}
          onChange={e => setBody(e.target.value)}
          style={{
            border: 'none', borderRadius: 0, padding: '16px 20px',
            minHeight: 240, flex: 1, resize: 'none', fontSize: 14,
            lineHeight: 1.6, background: 'transparent',
          }}
        />

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 20px', borderTop: '1px solid var(--border)',
        }}>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || !to.trim() || !body.trim()}
            style={{ gap: 8, padding: '8px 20px' }}
          >
            <Send size={14} strokeWidth={2} />
            {sending ? 'Encrypting & sending...' : 'Send'}
          </button>
          <button className="btn" style={{ gap: 6 }}>
            <Paperclip size={13} strokeWidth={2} />
            Attach
          </button>
          {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <Lock size={13} color="var(--green)" strokeWidth={2} />
            <span style={{ color: 'var(--green)', fontWeight: 500 }}>ML-KEM-768 + ML-DSA-65</span>
            <span style={{ color: 'var(--fg-muted)' }}>· Quantum Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
