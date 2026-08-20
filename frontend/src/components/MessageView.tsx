import {
  ArrowLeft, Mail, Star, ChevronUp, ChevronDown, Reply, ReplyAll, Forward,
  Lock, Unlock, ShieldCheck, Printer,
} from 'lucide-react';
import { AVATARS, getInitials } from '@/data';
import type { Email } from '@/types';

interface Props {
  email: Email;
  starred: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onBack: () => void;
  onToggleStar: () => void;
  onMarkUnread: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
}

export default function MessageView({
  email, starred, hasPrev, hasNext,
  onBack, onToggleStar, onMarkUnread, onPrev, onNext, onReply, onReplyAll, onForward,
}: Props) {
  const av = AVATARS[email.avatarIdx % AVATARS.length];

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, flex: 'none',
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <button className="btn btn-icon" title="Back to list" onClick={onBack}>
          <ArrowLeft size={18} strokeWidth={1.8} />
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 6px' }} />
        <button className="btn btn-icon" title="Mark as unread" onClick={onMarkUnread}>
          <Mail size={17} strokeWidth={1.8} />
        </button>
        <button
          className="btn btn-icon"
          title={starred ? 'Unstar' : 'Star'}
          onClick={onToggleStar}
          style={{ color: starred ? '#f5a623' : undefined }}
        >
          <Star size={17} strokeWidth={1.8} fill={starred ? 'currentColor' : 'none'} />
        </button>
        <button className="btn btn-icon" title="Print" onClick={() => window.print()}>
          <Printer size={17} strokeWidth={1.8} />
        </button>

        <div style={{ flex: 1 }} />

        <button className="btn btn-icon" title="Previous message" disabled={!hasPrev} onClick={onPrev}>
          <ChevronUp size={18} strokeWidth={1.8} />
        </button>
        <button className="btn btn-icon" title="Next message" disabled={!hasNext} onClick={onNext}>
          <ChevronDown size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>
        <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {email.subject}
        </h1>

        <div style={{
          border: '1px solid var(--border)', borderRadius: 'var(--radius-l)',
          background: 'var(--bg-secondary)', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 20px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-m)', background: av.bg, flex: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: av.color,
            }}>
              {getInitials(email.sender)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--fg-secondary)', width: 40 }}>From</span>
                {email.encrypted
                  ? <Lock size={13} color="var(--green)" strokeWidth={2.4} />
                  : <Unlock size={13} color="var(--fg-muted)" strokeWidth={2.4} />}
                <span style={{ fontSize: 14, fontWeight: 600 }}>{email.sender}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>&lt;{email.senderEmail}&gt;</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-secondary)', width: 40 }}>Date</span>
                <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{email.fullDate}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
              <button className="btn btn-icon" title="Reply" onClick={onReply}>
                <Reply size={16} strokeWidth={1.8} />
              </button>
              <button className="btn btn-icon" title="Reply all" onClick={onReplyAll}>
                <ReplyAll size={16} strokeWidth={1.8} />
              </button>
              <button className="btn btn-icon" title="Forward" onClick={onForward}>
                <Forward size={16} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div style={{ padding: '0 20px 16px' }}>
            {email.encrypted ? (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'var(--green-bg)', border: '1px solid var(--green-border)',
                borderRadius: 'var(--radius-m)', padding: '10px 14px',
              }}>
                <ShieldCheck size={16} color="var(--green)" strokeWidth={2} style={{ flex: 'none', marginTop: 1 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-fg)' }}>
                    Decrypted with ML-KEM-768 · Signature verified (ML-DSA-65)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                    Sender key fingerprint:{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)' }}>
                      {email.fingerprint}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-m)', padding: '10px 14px',
              }}>
                <Unlock size={16} color="var(--fg-muted)" strokeWidth={2} />
                <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
                  Standard TLS encryption — quantum signature not available
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          <div style={{
            padding: '24px 20px', fontSize: 14, lineHeight: 1.75,
            color: 'var(--fg)', whiteSpace: 'pre-line',
          }}>
            {email.body}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={onReply} style={{ height: 38, borderRadius: 'var(--radius-full)' }}>
            <Reply size={15} strokeWidth={1.8} />
            Reply
          </button>
          <button className="btn" onClick={onReplyAll} style={{ height: 38, borderRadius: 'var(--radius-full)' }}>
            <ReplyAll size={15} strokeWidth={1.8} />
            Reply all
          </button>
          <button className="btn" onClick={onForward} style={{ height: 38, borderRadius: 'var(--radius-full)' }}>
            <Forward size={15} strokeWidth={1.8} />
            Forward
          </button>
        </div>
      </div>
    </>
  );
}
