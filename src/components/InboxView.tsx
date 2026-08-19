import { useState } from 'react';
import {
  Star,
  Paperclip,
  BadgeCheck,
  ShieldCheck,
  Lock,
  AlertTriangle,
  Send,
  Archive,
  Trash2,
  CornerUpLeft,
  ArrowRight,
  Clock,
  KeyRound,
  Fingerprint,
  FileText,
  Download,
} from 'lucide-react';
import type { Email } from '@/types';
import { mockEmails } from '@/mockData';
import { formatDate, formatTime, getInitials, encryptionStatusConfig } from '@/utils';

export default function InboxView({ onCompose }: { onCompose: () => void }) {
  const [emails] = useState<Email[]>(mockEmails);
  const [selected, setSelected] = useState<Email | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');

  const filtered = emails.filter((e) => {
    if (filter === 'unread') return !e.read;
    if (filter === 'starred') return e.starred;
    return true;
  });

  if (selected) {
    return <EmailDetailView email={selected} onBack={() => setSelected(null)} onCompose={onCompose} />;
  }

  return (
    <div className="flex h-[calc(100vh-73px)] animate-fade-in">
      {/* Email list */}
      <div className={`flex-1 flex flex-col ${selected ? 'hidden lg:flex' : ''}`}>
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-8 py-3 border-b border-white/5">
          {(['all', 'unread', 'starred'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-quantum-500/15 text-quantum-300 border border-quantum-500/20'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {f} {f === 'unread' && `(${emails.filter((e) => !e.read).length})`}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={onCompose}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-quantum-600 to-accent-600 text-xs font-medium hover:from-quantum-500 hover:to-accent-500 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Compose
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.map((email) => {
            const enc = encryptionStatusConfig[email.encryption];
            return (
              <div
                key={email.id}
                onClick={() => setSelected(email)}
                className="flex items-start gap-4 px-8 py-4 border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-quantum-500/80 to-accent-600/80 flex items-center justify-center text-xs font-bold text-white">
                    {getInitials(email.fromName)}
                  </div>
                  {!email.read && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-quantum-400 border-2 border-slate-900" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm truncate ${email.read ? 'font-normal text-slate-300' : 'font-semibold text-white'}`}>
                      {email.fromName}
                    </span>
                    {email.signed && email.signatureValid && (
                      <BadgeCheck className="w-4 h-4 text-success-400 shrink-0" />
                    )}
                    {email.signed && !email.signatureValid && (
                      <AlertTriangle className="w-4 h-4 text-warning-400 shrink-0" />
                    )}
                    {email.starred && <Star className="w-3.5 h-3.5 text-warning-400 fill-warning-400 shrink-0" />}
                    <span className="text-xs text-slate-600 ml-auto shrink-0">{formatDate(email.date)}</span>
                  </div>
                  <p className={`text-sm truncate ${email.read ? 'text-slate-400' : 'text-slate-200'}`}>
                    {email.subject}
                  </p>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{email.preview}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${enc.bg} ${enc.color} border ${enc.border} font-medium flex items-center gap-1`}>
                      <Lock className="w-2.5 h-2.5" />
                      {enc.label}
                    </span>
                    {email.signed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-success-500/10 text-success-300 border border-success-500/20 font-medium flex items-center gap-1">
                        <Fingerprint className="w-2.5 h-2.5" />
                        {email.signatureAlgorithm}
                      </span>
                    )}
                    {email.attachments.length > 0 && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Paperclip className="w-2.5 h-2.5" />
                        {email.attachments.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmailDetailView({ email, onBack, onCompose }: { email: Email; onBack: () => void; onCompose: () => void }) {
  const enc = encryptionStatusConfig[email.encryption];

  return (
    <div className="h-[calc(100vh-73px)] overflow-y-auto scrollbar-thin animate-fade-in">
      {/* Action bar */}
      <div className="sticky top-0 z-10 glass border-b border-white/5 px-8 py-3 flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <CornerUpLeft className="w-3.5 h-3.5" />
          Back to Inbox
        </button>
        <div className="flex-1" />
        <button className="p-2 rounded-lg text-slate-400 hover:text-warning-400 hover:bg-white/5 transition-colors">
          <Star className={`w-4 h-4 ${email.starred ? 'fill-warning-400 text-warning-400' : ''}`} />
        </button>
        <button className="p-2 rounded-lg text-slate-400 hover:text-quantum-400 hover:bg-white/5 transition-colors">
          <CornerUpLeft className="w-4 h-4" />
        </button>
        <button onClick={onCompose} className="p-2 rounded-lg text-slate-400 hover:text-quantum-400 hover:bg-white/5 transition-colors">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-300 hover:bg-white/5 transition-colors">
          <Archive className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-lg text-slate-400 hover:text-error-400 hover:bg-white/5 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Encryption banner */}
        <div className={`rounded-xl border ${enc.border} ${enc.bg} p-4 mb-6 flex items-center gap-4`}>
          <div className={`w-10 h-10 rounded-lg ${enc.bg} ${enc.color} flex items-center justify-center`}>
            {email.encryption === 'quantum-secure' ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${enc.color}`}>This email is {enc.label.toLowerCase()}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Encrypted with AES-256-GCM using a QKD-derived session key encapsulated via ML-KEM-768
            </p>
          </div>
          {email.signed && email.signatureValid && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success-500/10 border border-success-500/20">
              <BadgeCheck className="w-4 h-4 text-success-400" />
              <span className="text-xs text-success-300">Signature Verified</span>
            </div>
          )}
        </div>

        {/* Subject */}
        <h1 className="text-2xl font-bold text-white mb-6">{email.subject}</h1>

        {/* Sender info */}
        <div className="flex items-start gap-4 pb-6 border-b border-white/5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-quantum-500 to-accent-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {getInitials(email.fromName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{email.fromName}</span>
              <span className="text-xs text-slate-500">&lt;{email.from}&gt;</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>To: {email.to}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(email.date)} · {formatTime(email.date)}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="py-6">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{email.body}</p>
        </div>

        {/* Attachments */}
        {email.attachments.length > 0 && (
          <div className="pb-6 border-t border-white/5 pt-6">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-slate-400" />
              Encrypted Attachments ({email.attachments.length})
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {email.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-quantum-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-quantum-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{att.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{att.size}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-success-500/10 text-success-300 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Encrypted
                      </span>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg text-slate-400 hover:text-quantum-400 hover:bg-white/5 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crypto metadata */}
        <div className="mt-6 rounded-xl border border-white/5 bg-slate-900/50 p-5">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-quantum-400" />
            Cryptographic Metadata
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <CryptoMeta label="Encryption Algorithm" value="AES-256-GCM" />
            <CryptoMeta label="Key Encapsulation" value="ML-KEM-768 (FIPS 203)" />
            <CryptoMeta label="Signature Algorithm" value={email.signatureAlgorithm || 'None'} />
            <CryptoMeta label="Signature Status" value={email.signatureValid ? 'Verified ✓' : 'N/A'} valid={email.signatureValid} />
            <CryptoMeta label="Key ID" value={email.keyIdUsed} mono />
            <CryptoMeta label="QKD Channel" value="BB84 · SAC-Node-A ↔ SAC-Node-B" mono />
          </div>
        </div>

        {/* Reply actions */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onCompose}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-quantum-600 to-accent-600 text-sm font-medium hover:from-quantum-500 hover:to-accent-500 transition-all flex items-center gap-2"
          >
            <CornerUpLeft className="w-4 h-4" />
            Reply Securely
          </button>
          <button
            onClick={onCompose}
            className="px-4 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}

function CryptoMeta({ label, value, mono, valid }: { label: string; value: string; mono?: boolean; valid?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono' : ''} ${valid ? 'text-success-300' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}
