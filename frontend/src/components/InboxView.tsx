import { Search, Lock, Unlock, Reply, Forward, Archive, Trash2, ShieldCheck } from 'lucide-react';
import { AVATARS, FOLDER_LABELS, getInitials } from '@/data';
import type { Email } from '@/types';

interface Props {
  activeFolder: string;
  selectedId: number | null;
  search: string;
  emails: Email[];
  onSelectEmail: (id: number) => void;
  onSearchChange: (q: string) => void;
}

export default function InboxView({ activeFolder, selectedId, search, emails, onSelectEmail, onSearchChange }: Props) {
  const inFolder = emails.filter(e => e.folder === activeFolder);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? inFolder.filter(e => (e.sender + e.subject + e.preview).toLowerCase().includes(q))
    : inFolder;

  const currentId = selectedId ?? filtered[0]?.id ?? null;
  const selected = emails.find(e => e.id === currentId) ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', minWidth: 0 }}>
      {/* Top bar */}
      <div style={{ height: 52, flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            color="var(--color-neutral-600)"
          />
          <input
            className="input"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search messages…"
            style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--color-neutral-500)' }}>
          <Lock size={12} color="#5fbf82" strokeWidth={2.4} />
          <span style={{ color: '#5fbf82', fontWeight: 500 }}>End-to-end encrypted</span>
          <span style={{ color: 'var(--color-neutral-600)' }}>·</span>
          <span>Post-quantum secured session</span>
        </div>
      </div>

      {/* Two-column content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Message list */}
        <div
          className="scrollbar-thin"
          style={{ width: 340, flex: 'none', borderRight: '1px solid var(--color-divider)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ padding: '10px 16px 6px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>
            {FOLDER_LABELS[activeFolder] ?? activeFolder}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '24px 16px', fontSize: 12, color: 'var(--color-neutral-600)', textAlign: 'center' }}>
              No messages in this folder
            </div>
          )}
          {filtered.map(email => {
            const av = AVATARS[email.avatarIdx % AVATARS.length];
            const initials = getInitials(email.sender);
            const isSelected = email.id === currentId;
            return (
              <div
                key={email.id}
                className={`email-row ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectEmail(email.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: av.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600, color: av.color, flex: 'none',
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: email.unread ? 600 : 400, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email.sender}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-neutral-600)', flex: 'none' }}>{email.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                      {email.encrypted ? (
                        <Lock size={10} color="#5fbf82" strokeWidth={2.8} style={{ flex: 'none' }} />
                      ) : (
                        <Unlock size={10} color="var(--color-neutral-600)" strokeWidth={2.8} style={{ flex: 'none' }} />
                      )}
                      <span style={{ fontSize: 12, color: 'var(--color-neutral-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email.subject}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {email.preview}
                    </div>
                  </div>
                </div>
                {email.label && (
                  <div style={{ marginTop: 4, marginLeft: 36 }}>
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: email.labelBg, color: email.labelColor }}>
                      {email.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reading pane */}
        <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', minWidth: 0, background: 'var(--color-bg)' }}>
          {selected && <ReadingPane email={selected} />}
        </div>
      </div>
    </div>
  );
}

function ReadingPane({ email }: { email: Email }) {
  const av = AVATARS[email.avatarIdx % AVATARS.length];
  const initials = getInitials(email.sender);

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 20px', borderBottom: '1px solid var(--color-divider)' }}>
        <button className="btn btn-icon" title="Reply"><Reply size={14} strokeWidth={1.7} /></button>
        <button className="btn btn-icon" title="Forward"><Forward size={14} strokeWidth={1.7} /></button>
        <div style={{ width: 1, height: 18, background: 'var(--color-divider)', margin: '0 4px' }} />
        <button className="btn btn-icon" title="Archive"><Archive size={14} strokeWidth={1.7} /></button>
        <button className="btn btn-icon" title="Delete"><Trash2 size={14} strokeWidth={1.7} /></button>
        <div style={{ flex: 1 }} />
        {email.encrypted && (
          <span
            className="tag"
            style={{
              fontSize: 9, padding: '3px 8px',
              background: 'rgba(95,191,130,0.12)', color: '#5fbf82',
              border: '1px solid rgba(95,191,130,0.25)',
            }}
          >
            <Lock size={9} color="#5fbf82" strokeWidth={2.6} style={{ marginRight: 4, verticalAlign: -1 }} />
            PQC Verified
          </span>
        )}
      </div>

      {/* Email content */}
      <div style={{ padding: '24px 28px' }}>
        {email.encrypted && (
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(95,191,130,0.08)', border: '1px solid rgba(95,191,130,0.2)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20,
            }}
          >
            <ShieldCheck size={15} color="#4a9a64" strokeWidth={2} style={{ flex: 'none', marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#5fbf82', marginBottom: 2 }}>
                Decrypted with ML-KEM-768 · Signature verified (ML-DSA-65)
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-neutral-500)' }}>
                Sender key fingerprint: <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--color-neutral-400)' }}>{email.fingerprint}</span>
              </div>
            </div>
          </div>
        )}

        {!email.encrypted && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'color-mix(in srgb, var(--color-neutral-600) 12%, transparent)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20,
            }}
          >
            <Unlock size={15} color="var(--color-neutral-500)" strokeWidth={2} />
            <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>
              Standard TLS encryption — quantum signature not available
            </div>
          </div>
        )}

        <h3 style={{ margin: '0 0 8px', fontSize: 20, fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight)' as any }}>
          {email.subject}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--color-divider)' }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: '50%', background: av.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: av.color, flex: 'none',
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{email.sender}</span>
              <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>&lt;{email.senderEmail}&gt;</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 1 }}>{email.fullDate}</div>
          </div>
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--color-neutral-300)', whiteSpace: 'pre-line' }}>
          {email.body}
        </div>
      </div>
    </>
  );
}
