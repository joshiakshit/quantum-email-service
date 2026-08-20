import { Search, Lock, Unlock, Reply, Forward, Archive, Trash2, ShieldCheck, Inbox, Mail, RefreshCw } from 'lucide-react';
import { AVATARS, FOLDER_LABELS, getInitials } from '@/data';
import type { Email } from '@/types';

interface Props {
  activeFolder: string;
  selectedId: number | null;
  search: string;
  emails: Email[];
  onSelectEmail: (id: number) => void;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
}

export default function InboxView({ activeFolder, selectedId, search, emails, onSelectEmail, onSearchChange, onRefresh }: Props) {
  const inFolder = emails.filter(e => e.folder === activeFolder);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? inFolder.filter(e => (e.sender + e.subject + e.preview).toLowerCase().includes(q))
    : inFolder;

  const currentId = selectedId ?? filtered[0]?.id ?? null;
  const selected = emails.find(e => e.id === currentId) ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', minWidth: 0 }}>
      {/* Search bar */}
      <div style={{
        height: 52, flex: 'none', display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 500 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            color="var(--fg-muted)"
          />
          <input
            className="input"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search mail"
            style={{
              paddingLeft: 36, height: 38, fontSize: 14,
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-secondary)',
              border: '1px solid transparent',
            }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-icon"
          title="Refresh"
          onClick={onRefresh}
          style={{ marginRight: 4 }}
        >
          <RefreshCw size={14} strokeWidth={1.7} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
          <Lock size={11} color="var(--green)" strokeWidth={2.4} />
          <span style={{ color: 'var(--green)', fontWeight: 500, fontSize: 11 }}>PQC</span>
        </div>
      </div>

      {/* Two-column content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Message list */}
        <div
          className="scrollbar-thin"
          style={{
            width: 380, flex: 'none', borderRight: '1px solid var(--border)',
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
            background: 'var(--bg)',
          }}
        >
          <div style={{
            padding: '12px 16px 8px', fontSize: 13,
            color: 'var(--fg)', fontWeight: 600,
          }}>
            {FOLDER_LABELS[activeFolder] ?? activeFolder}
          </div>

          {filtered.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
            }}>
              <Inbox size={28} color="var(--fg-faint)" strokeWidth={1.4} />
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 12 }}>
                No messages
              </div>
            </div>
          )}

          {filtered.map(email => {
            const isSelected = email.id === currentId;
            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--accent-bg)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, minWidth: 0 }}>
                  {/* Sender */}
                  <span style={{
                    fontSize: 13, fontWeight: email.unread ? 600 : 400,
                    color: 'var(--fg)',
                    width: 120, flex: 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {email.sender}
                  </span>

                  {/* Subject + preview */}
                  <span style={{
                    flex: 1, minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontSize: 13,
                  }}>
                    <span style={{
                      color: 'var(--fg)',
                      fontWeight: email.unread ? 500 : 400,
                    }}>
                      {email.subject}
                    </span>
                    <span style={{ color: 'var(--fg-muted)' }}>
                      {' '} — {email.preview}
                    </span>
                  </span>

                  {/* Right side: encryption + date */}
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    flex: 'none', marginLeft: 10,
                  }}>
                    {email.encrypted && (
                      <Lock size={10} color="var(--green)" strokeWidth={2.6} />
                    )}
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                      {email.time}
                    </span>
                  </span>
                </div>

                {email.label && (
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 3,
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
              <Mail size={32} color="var(--fg-faint)" strokeWidth={1.4} />
              <div style={{ fontSize: 14, color: 'var(--fg-muted)', marginTop: 12 }}>
                Select a message to read
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
