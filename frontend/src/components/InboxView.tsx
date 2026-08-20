import { Search, Lock, Unlock, Reply, Forward, Archive, Trash2, ShieldCheck, Inbox, Mail } from 'lucide-react';
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', minWidth: 0 }}>
      {/* Top bar */}
      <div style={{
        height: 52, flex: 'none', display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            color="var(--fg-muted)"
          />
          <input
            className="input"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search messages..."
            style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--fg-muted)' }}>
          <Lock size={12} color="var(--green)" strokeWidth={2.4} />
          <span style={{ color: 'var(--green)', fontWeight: 500 }}>End-to-end encrypted</span>
          <span style={{ color: 'var(--fg-faint)' }}>·</span>
          <span>Post-quantum secured</span>
        </div>
      </div>

      {/* Two-column content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Message list */}
        <div
          className="scrollbar-thin"
          style={{
            width: 360, flex: 'none', borderRight: '1px solid var(--border)',
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{
            padding: '10px 16px 6px', fontSize: 10, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--fg-muted)', fontWeight: 500,
          }}>
            {FOLDER_LABELS[activeFolder] ?? activeFolder}
          </div>

          {filtered.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Inbox size={22} color="var(--accent)" strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-secondary)', marginBottom: 6 }}>
                No messages
              </div>
              <div style={{
                fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center',
                lineHeight: 1.5, maxWidth: 200,
              }}>
                Send a quantum-encrypted email to get started
              </div>
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
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: av.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, color: av.color, flex: 'none', marginTop: 2,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{
                        fontSize: 13, fontWeight: email.unread ? 600 : 400, color: 'var(--fg)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {email.sender}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--fg-muted)', flex: 'none' }}>{email.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      {email.encrypted ? (
                        <Lock size={10} color="var(--green)" strokeWidth={2.8} style={{ flex: 'none' }} />
                      ) : (
                        <Unlock size={10} color="var(--fg-faint)" strokeWidth={2.8} style={{ flex: 'none' }} />
                      )}
                      <span style={{
                        fontSize: 12, color: 'var(--fg-secondary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {email.subject}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--fg-muted)', marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {email.preview}
                    </div>
                  </div>
                </div>
                {email.label && (
                  <div style={{ marginTop: 6, marginLeft: 42 }}>
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 3,
                      background: email.labelBg, color: email.labelColor, fontWeight: 500,
                    }}>
                      {email.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reading pane */}
        <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', minWidth: 0, background: 'var(--bg)' }}>
          {selected ? (
            <ReadingPane email={selected} />
          ) : (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: 40,
            }}>
              <Mail size={32} color="var(--fg-faint)" strokeWidth={1.5} />
              <div style={{ fontSize: 14, color: 'var(--fg-muted)', marginTop: 12 }}>
                Select a message to read
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 16,
                fontSize: 11, color: 'var(--fg-muted)',
              }}>
                <Lock size={11} color="var(--green)" strokeWidth={2.4} />
                <span>All messages are end-to-end encrypted</span>
              </div>
            </div>
          )}
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 20px', borderBottom: '1px solid var(--border)',
      }}>
        <button className="btn btn-icon" title="Reply"><Reply size={14} strokeWidth={1.7} /></button>
        <button className="btn btn-icon" title="Forward"><Forward size={14} strokeWidth={1.7} /></button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
        <button className="btn btn-icon" title="Archive"><Archive size={14} strokeWidth={1.7} /></button>
        <button className="btn btn-icon" title="Delete"><Trash2 size={14} strokeWidth={1.7} /></button>
        <div style={{ flex: 1 }} />
        {email.encrypted && (
          <span className="tag tag-green" style={{ fontSize: 9, padding: '3px 8px', gap: 4 }}>
            <Lock size={9} strokeWidth={2.6} />
            PQC Verified
          </span>
        )}
      </div>

      {/* Email content */}
      <div style={{ padding: '24px 28px' }}>
        {email.encrypted && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'var(--green-bg)', border: '1px solid var(--green-border)',
            borderRadius: 'var(--radius-m)', padding: '10px 14px', marginBottom: 20,
          }}>
            <ShieldCheck size={15} color="var(--green)" strokeWidth={2} style={{ flex: 'none', marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--green)', marginBottom: 2 }}>
                Decrypted with ML-KEM-768 · Signature verified (ML-DSA-65)
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>
                Sender key fingerprint: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)' }}>{email.fingerprint}</span>
              </div>
            </div>
          </div>
        )}

        {!email.encrypted && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-hover)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-m)', padding: '10px 14px', marginBottom: 20,
          }}>
            <Unlock size={15} color="var(--fg-muted)" strokeWidth={2} />
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              Standard TLS encryption — quantum signature not available
            </div>
          </div>
        )}

        <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {email.subject}
        </h3>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          paddingBottom: 16, borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', background: av.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: av.color, flex: 'none',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{email.sender}</span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>&lt;{email.senderEmail}&gt;</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{email.fullDate}</div>
          </div>
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--fg-secondary)', whiteSpace: 'pre-line' }}>
          {email.body}
        </div>
      </div>
    </>
  );
}
