import { useState } from 'react';
import { Plus, X, Send, Paperclip, Lock } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function ComposeModal({ onClose }: Props) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

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
          width: 720, borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} color="var(--color-accent)" strokeWidth={1.8} />
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 500 }}>New message</div>
          </div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--color-neutral-500)', display: 'flex', padding: 4 }}>
            <X size={15} strokeWidth={2} />
          </div>
        </div>

        {/* To / Subject */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <input
            className="input"
            placeholder="To"
            value={to}
            onChange={e => setTo(e.target.value)}
            style={{ border: 'none', borderBottom: '1px solid var(--color-divider)', borderRadius: 0, padding: '10px 20px', fontSize: 13 }}
          />
          <input
            className="input"
            placeholder="Subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            style={{ border: 'none', borderBottom: '1px solid var(--color-divider)', borderRadius: 0, padding: '10px 20px', fontSize: 13 }}
          />
        </div>

        {/* Body */}
        <textarea
          className="input"
          placeholder="Write your message…"
          value={body}
          onChange={e => setBody(e.target.value)}
          style={{ border: 'none', borderRadius: 0, padding: '16px 20px', minHeight: 240, flex: 1, resize: 'none', fontSize: 14, lineHeight: 1.6 }}
        />

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid var(--color-divider)' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ gap: 8, padding: '8px 20px' }}>
            <Send size={14} strokeWidth={2} />
            Send
          </button>
          <button className="btn btn-secondary" style={{ gap: 6 }}>
            <Paperclip size={13} strokeWidth={2} />
            Attach
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <Lock size={13} color="#5fbf82" strokeWidth={2} />
            <span style={{ color: '#5fbf82', fontWeight: 500 }}>ML-KEM-768 + ML-DSA-65</span>
            <span style={{ color: 'var(--color-neutral-600)' }}>· Quantum Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
