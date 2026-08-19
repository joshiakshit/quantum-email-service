import { useState } from 'react';
import {
  Shield,
  Bell,
  KeyRound,
  Server,
  Mail,
  Lock,
  Fingerprint,
  Atom,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Trash2,
  Info,
} from 'lucide-react';
import { mockCurrentUser } from '@/mockData';

export default function SettingsView() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [notifyQBER, setNotifyQBER] = useState(true);
  const [notifyNewKey, setNotifyNewKey] = useState(true);
  const [requireSignature, setRequireSignature] = useState(true);
  const [hybridMode, setHybridMode] = useState(false);

  return (
    <div className="p-8 animate-fade-in max-w-4xl">
      {/* Profile section */}
      <SettingsSection icon={<Shield className="w-4 h-4" />} title="Profile" desc="Your quantum identity information">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mockCurrentUser.avatarColor} flex items-center justify-center text-sm font-bold text-white`}>
            {mockCurrentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{mockCurrentUser.name}</p>
            <p className="text-xs text-slate-500">{mockCurrentUser.email}</p>
            <p className="text-xs text-slate-500">{mockCurrentUser.organization} · {mockCurrentUser.role}</p>
          </div>
          <span className="text-[10px] font-mono text-quantum-300 px-2 py-1 rounded-md bg-quantum-500/10">
            {mockCurrentUser.keyId}
          </span>
        </div>
      </SettingsSection>

      {/* Security */}
      <SettingsSection icon={<Lock className="w-4 h-4" />} title="Security" desc="Encryption and key management preferences">
        <ToggleRow
          icon={<KeyRound className="w-4 h-4" />}
          label="Automatic Key Rotation"
          desc="Rotate AES-256 session keys every 12 hours"
          value={autoRotate}
          onChange={setAutoRotate}
        />
        <ToggleRow
          icon={<Fingerprint className="w-4 h-4" />}
          label="Require Digital Signature"
          desc="Block sending unsigned emails"
          value={requireSignature}
          onChange={setRequireSignature}
        />
        <ToggleRow
          icon={<Atom className="w-4 h-4" />}
          label="Hybrid Encryption Mode"
          desc="Use both classical + post-quantum during transition"
          value={hybridMode}
          onChange={setHybridMode}
        />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection icon={<Bell className="w-4 h-4" />} title="Notifications" desc="Alert preferences for security events">
        <ToggleRow
          icon={<AlertTriangle className="w-4 h-4" />}
          label="QBER Anomaly Alerts"
          desc="Notify when QBER exceeds 5% threshold"
          value={notifyQBER}
          onChange={setNotifyQBER}
        />
        <ToggleRow
          icon={<KeyRound className="w-4 h-4" />}
          label="New Key Generated"
          desc="Notify when a new post-quantum key is created"
          value={notifyNewKey}
          onChange={setNotifyNewKey}
        />
      </SettingsSection>

      {/* Server config */}
      <SettingsSection icon={<Server className="w-4 h-4" />} title="Key Manager Connection" desc="Local Key Manager service configuration">
        <div className="space-y-3">
          <ConfigRow label="KM Endpoint" value="https://localhost:8443" />
          <ConfigRow label="Auth Method" value="Mutual TLS + JWT" />
          <ConfigRow label="Client ID" value={mockCurrentUser.id} mono />
          <ConfigRow label="Connection Status" value="Connected" status="success" />
        </div>
      </SettingsSection>

      {/* Email protocols */}
      <SettingsSection icon={<Mail className="w-4 h-4" />} title="Email Protocols" desc="SMTP and IMAP server configuration">
        <div className="space-y-3">
          <ConfigRow label="SMTP Server" value="smtp.isro.gov.in:465" />
          <ConfigRow label="IMAP Server" value="imap.isro.gov.in:993" />
          <ConfigRow label="TLS" value="Enforced (TLS 1.3)" />
          <ConfigRow label="Encryption Layer" value="QKD-PQC Plugin Active" status="success" />
        </div>
      </SettingsSection>

      {/* Key backup */}
      <SettingsSection icon={<KeyRound className="w-4 h-4" />} title="Key Backup & Recovery" desc="Export or import your post-quantum keys">
        <div className="grid sm:grid-cols-3 gap-3">
          <ActionCard icon={<Download className="w-5 h-5" />} label="Export Keys" desc="Download encrypted key bundle" />
          <ActionCard icon={<Upload className="w-5 h-5" />} label="Import Keys" desc="Restore from backup" />
          <ActionCard icon={<Trash2 className="w-5 h-5" />} label="Purge Keys" desc="Permanently delete all keys" danger />
        </div>

        <div className="mt-4 flex gap-3 p-4 rounded-xl border border-warning-500/20 bg-warning-500/5">
          <Info className="w-4 h-4 text-warning-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Exported keys are encrypted with your ML-KEM-768 public key. Store the backup in a secure offline location.
            Loss of private keys means all encrypted emails become permanently unreadable.
          </p>
        </div>
      </SettingsSection>

      {/* About */}
      <SettingsSection icon={<Info className="w-4 h-4" />} title="About QuMail" desc="Project information">
        <div className="grid sm:grid-cols-2 gap-3">
          <InfoRow label="Version" value="1.0.0 MVP" />
          <InfoRow label="Build" value="SIH-2026-120" />
          <InfoRow label="Crypto Library" value="liboqs (Open Quantum Safe)" />
          <InfoRow label="PQC Standards" value="NIST FIPS 203 / 204 / 205" />
          <InfoRow label="QKD Protocols" value="BB84, E91, Decoy-State" />
          <InfoRow label="Statement" value="#120 — ISRO" />
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-quantum-500/10 text-quantum-400 flex items-center justify-center">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-5">{children}</div>
    </div>
  );
}

function ToggleRow({ icon, label, desc, value, onChange }: { icon: React.ReactNode; label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
      <span className="text-slate-400">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-quantum-600' : 'bg-slate-700'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

function ConfigRow({ label, value, mono, status }: { label: string; value: string; mono?: boolean; status?: 'success' | 'error' }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${mono ? 'font-mono text-quantum-300' : 'text-slate-300'}`}>{value}</span>
        {status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-success-400" />}
      </div>
    </div>
  );
}

function ActionCard({ icon, label, desc, danger }: { icon: React.ReactNode; label: string; desc: string; danger?: boolean }) {
  return (
    <button className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-colors text-left ${danger ? 'border-error-500/20 bg-error-500/5 hover:bg-error-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
      <span className={danger ? 'text-error-400' : 'text-quantum-400'}>{icon}</span>
      <div>
        <p className={`text-sm font-medium ${danger ? 'text-error-300' : 'text-white'}`}>{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-mono text-slate-300">{value}</span>
    </div>
  );
}
