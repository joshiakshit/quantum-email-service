import { useState } from 'react';
import {
  Send,
  Paperclip,
  Lock,
  KeyRound,
  Fingerprint,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  X,
  AlertTriangle,
  Atom,
  Zap,
  Cpu,
  ArrowRight,
} from 'lucide-react';

type SendPhase = 'idle' | 'requesting-key' | 'encapsulating' | 'encrypting' | 'signing' | 'sending' | 'sent';

const phases: { phase: SendPhase; label: string; detail: string }[] = [
  { phase: 'requesting-key', label: 'Requesting session key from Key Manager', detail: 'HTTPS → KM → QKD channel' },
  { phase: 'encapsulating', label: 'ML-KEM-768 key encapsulation', detail: 'CRYSTALS-Kyber (FIPS 203)' },
  { phase: 'encrypting', label: 'AES-256-GCM encryption', detail: 'Encrypting email body + attachments' },
  { phase: 'signing', label: 'ML-DSA-65 digital signature', detail: 'CRYSTALS-Dilithium (FIPS 204)' },
  { phase: 'sending', label: 'Sending via encrypted SMTP', detail: 'MIME encoding → SMTP relay' },
];

export default function ComposeView({ onSent }: { onSent: () => void }) {
  const [to, setTo] = useState('priya.sharma@isro.gov.in');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<{ id: string; name: string; size: string }[]>([]);
  const [sendPhase, setSendPhase] = useState<SendPhase>('idle');
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);

  const canSend = to && subject && body && sendPhase === 'idle';

  const handleSend = () => {
    if (!canSend) return;
    setSendPhase('requesting-key');
    setCompletedPhases([]);

    phases.forEach((_, i) => {
      setTimeout(() => {
        setCompletedPhases((prev) => [...prev, i]);
        if (i < phases.length - 1) {
          setSendPhase(phases[i + 1].phase);
        } else {
          setSendPhase('sending');
          setTimeout(() => {
            setSendPhase('sent');
          }, 800);
        }
      }, 900 * (i + 1));
    });
  };

  const handleReset = () => {
    setSendPhase('idle');
    setCompletedPhases([]);
    setSubject('');
    setBody('');
    setAttachments([]);
  };

  const handleAttach = () => {
    const names = ['mission_report.pdf', 'key_log.csv', 'calibration_data.bin', 'thermal_data.xlsx'];
    const sizes = ['1.2 MB', '340 KB', '4.7 MB', '890 KB'];
    const idx = attachments.length % names.length;
    setAttachments([...attachments, { id: `att-${Date.now()}`, name: names[idx], size: sizes[idx] }]);
  };

  if (sendPhase === 'sent') {
    return (
      <div className="h-[calc(100vh-73px)] flex items-center justify-center p-8 animate-fade-in">
        <div className="max-w-lg w-full">
          <div className="glass border border-success-500/20 rounded-2xl p-10 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-success-500/10 border border-success-500/30 flex items-center justify-center mb-6 animate-glow">
              <CheckCircle2 className="w-10 h-10 text-success-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Email Sent & Quantum-Secured</h2>
            <p className="text-sm text-slate-400 mb-6">
              Your email to <span className="text-quantum-300 font-mono">{to}</span> has been encrypted with
              ML-KEM-768, signed with ML-DSA-65, and transmitted via encrypted SMTP.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              <SentStat icon={<KeyRound className="w-4 h-4" />} label="Encryption" value="ML-KEM-768" />
              <SentStat icon={<Fingerprint className="w-4 h-4" />} label="Signature" value="ML-DSA-65" />
              <SentStat icon={<Lock className="w-4 h-4" />} label="Cipher" value="AES-256-GCM" />
              <SentStat icon={<Zap className="w-4 h-4" />} label="QKD Channel" value="BB84" />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-quantum-600 to-accent-600 text-sm font-medium hover:from-quantum-500 hover:to-accent-500 transition-all"
              >
                Compose Another
              </button>
              <button
                onClick={onSent}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
              >
                Back to Inbox
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isProcessing = sendPhase !== 'idle';

  return (
    <div className="p-8 animate-fade-in max-w-5xl mx-auto">
      {/* Encryption status bar */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-quantum-500/20 bg-quantum-500/5 mb-6">
        <div className="w-9 h-9 rounded-lg bg-quantum-500/15 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-quantum-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-quantum-200">End-to-End Quantum Encryption Enabled</p>
          <p className="text-xs text-slate-400">ML-KEM-768 + AES-256-GCM + ML-DSA-65 signature</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-md bg-success-500/10 text-success-300 font-mono">FIPS 203</span>
          <span className="text-[10px] px-2 py-1 rounded-md bg-success-500/10 text-success-300 font-mono">FIPS 204</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Compose form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 overflow-hidden">
            {/* To */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
              <label className="text-xs font-medium text-slate-500 w-12">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={isProcessing}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-600 disabled:opacity-50"
                placeholder="recipient@organization.gov.in"
              />
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-success-500/10 text-success-300 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Verified
              </span>
            </div>

            {/* Subject */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
              <label className="text-xs font-medium text-slate-500 w-12">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isProcessing}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-600 disabled:opacity-50"
                placeholder="Enter subject (will be encrypted)"
              />
            </div>

            {/* Body */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isProcessing}
              rows={14}
              className="w-full px-5 py-4 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600 resize-none disabled:opacity-50 scrollbar-thin"
              placeholder="Compose your quantum-secure message here...&#10;&#10;This message will be encrypted with AES-256-GCM using a QKD-derived session key, encapsulated with ML-KEM-768, and signed with ML-DSA-65 before sending."
            />

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="px-5 py-3 border-t border-white/5 space-y-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-300 flex-1">{att.name}</span>
                    <span className="text-xs text-slate-500">{att.size}</span>
                    <Lock className="w-3 h-3 text-success-400" />
                    <button
                      onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                      className="text-slate-500 hover:text-error-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-white/5 bg-white/[0.01]">
              <button
                onClick={handleAttach}
                disabled={isProcessing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Attach
              </button>
              <div className="flex-1" />
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Discard
              </button>
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-quantum-600 to-accent-600 text-sm font-medium hover:from-quantum-500 hover:to-accent-500 transition-all shadow-lg shadow-quantum-600/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Encrypting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Securely
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Encryption pipeline sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-accent-400" />
              Encryption Pipeline
            </h3>

            <div className="space-y-2">
              {phases.map((p, i) => {
                const isDone = completedPhases.includes(i);
                const isCurrent = sendPhase === p.phase;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-500 ${
                      isDone
                        ? 'border-success-500/30 bg-success-500/5'
                        : isCurrent
                        ? 'border-quantum-500/30 bg-quantum-500/5'
                        : 'border-white/5 bg-white/[0.02]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-success-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-quantum-400 animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${isDone ? 'text-success-200' : isCurrent ? 'text-quantum-200' : 'text-slate-400'}`}>
                        {p.label}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{p.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Architecture diagram */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Atom className="w-4 h-4 text-quantum-400" />
              Message Flow
            </h3>
            <div className="space-y-2">
              <FlowStep label="Compose" icon={<Send className="w-3 h-3" />} active={isProcessing} />
              <FlowConnector />
              <FlowStep label="Key Manager (HTTPS)" icon={<KeyRound className="w-3 h-3" />} active={sendPhase === 'requesting-key'} />
              <FlowConnector />
              <FlowStep label="QKD Channel (BB84)" icon={<Zap className="w-3 h-3" />} active={sendPhase === 'requesting-key'} />
              <FlowConnector />
              <FlowStep label="ML-KEM-768 Encaps" icon={<Lock className="w-3 h-3" />} active={sendPhase === 'encapsulating'} />
              <FlowConnector />
              <FlowStep label="AES-256-GCM Encrypt" icon={<ShieldCheck className="w-3 h-3" />} active={sendPhase === 'encrypting'} />
              <FlowConnector />
              <FlowStep label="ML-DSA-65 Sign" icon={<Fingerprint className="w-3 h-3" />} active={sendPhase === 'signing'} />
              <FlowConnector />
              <FlowStep label="SMTP Send" icon={<ArrowRight className="w-3 h-3" />} active={sendPhase === 'sending'} />
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-xl border border-warning-500/20 bg-warning-500/5 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-4 h-4 text-warning-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                The subject line is also encrypted. Only the recipient with the matching ML-KEM private key can decrypt the full message.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SentStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
      <span className="text-quantum-400">{icon}</span>
      <div>
        <p className="text-[10px] text-slate-500">{label}</p>
        <p className="text-xs font-mono text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function FlowStep({ label, icon, active }: { label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${active ? 'border-quantum-500/30 bg-quantum-500/10' : 'border-white/5 bg-white/[0.02]'}`}>
      <span className={active ? 'text-quantum-300' : 'text-slate-500'}>{icon}</span>
      <span className={`text-xs ${active ? 'text-quantum-200' : 'text-slate-400'}`}>{label}</span>
      {active && <Loader2 className="w-3 h-3 text-quantum-400 animate-spin ml-auto" />}
    </div>
  );
}

function FlowConnector() {
  return <div className="w-px h-3 bg-white/10 ml-4" />;
}
