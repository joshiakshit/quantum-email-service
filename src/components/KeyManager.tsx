import { useState } from 'react';
import {
  KeyRound,
  Fingerprint,
  Lock,
  Atom,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Trash2,
  Download,
  Clock,
  Cpu,
  Zap,
  Activity,
} from 'lucide-react';
import type { QuantumKey, KeyAlgorithm } from '@/types';
import { mockKeys, mockCurrentUser } from '@/mockData';
import { formatDate, keyStatusConfig, generateFingerprint, generateHexPreview } from '@/utils';

const algorithmIcons: Record<string, React.ReactNode> = {
  'ML-KEM-768': <KeyRound className="w-5 h-5" />,
  'ML-DSA-65': <Fingerprint className="w-5 h-5" />,
  'AES-256-GCM': <Lock className="w-5 h-5" />,
  Hybrid: <Atom className="w-5 h-5" />,
};

const purposeLabels: Record<string, string> = {
  encapsulation: 'Key Encapsulation',
  signature: 'Digital Signature',
  symmetric: 'Symmetric Encryption',
  hybrid: 'Hybrid (KEM + Signature)',
};

export default function KeyManager() {
  const [keys, setKeys] = useState<QuantumKey[]>(mockKeys);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [showGenModal, setShowGenModal] = useState(false);
  const [genAlgorithm, setGenAlgorithm] = useState<KeyAlgorithm>('ML-KEM-768');
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newKey: QuantumKey = {
        id: `KEY-${genAlgorithm.replace(/[^A-Z]/g, '').slice(0, 5)}-${generateHexPreview(4).toUpperCase()}`,
        algorithm: genAlgorithm,
        status: 'active',
        fingerprint: generateFingerprint(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        keySize: genAlgorithm === 'ML-KEM-768' ? '1184 bytes' : genAlgorithm === 'ML-DSA-65' ? '1952 bytes' : '32 bytes',
        purpose: genAlgorithm === 'ML-KEM-768' ? 'encapsulation' : genAlgorithm === 'ML-DSA-65' ? 'signature' : 'symmetric',
        rotations: 0,
        publicKeyPreview: 'a3f7b2c8e4d901f5b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
      };
      setKeys([newKey, ...keys]);
      setIsGenerating(false);
      setShowGenModal(false);
    }, 2000);
  };

  const handleRotate = (id: string) => {
    setKeys(keys.map((k) => (k.id === id ? { ...k, rotations: k.rotations + 1, createdAt: new Date().toISOString() } : k)));
  };

  const activeKeys = keys.filter((k) => k.status === 'active').length;
  const expiringKeys = keys.filter((k) => k.status === 'expiring').length;

  return (
    <div className="p-8 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={<KeyRound className="w-5 h-5" />} label="Total Keys" value={keys.length.toString()} color="quantum" />
        <SummaryCard icon={<CheckCircle2 className="w-5 h-5" />} label="Active" value={activeKeys.toString()} color="success" />
        <SummaryCard icon={<AlertTriangle className="w-5 h-5" />} label="Expiring Soon" value={expiringKeys.toString()} color="warning" />
        <SummaryCard icon={<RefreshCw className="w-5 h-5" />} label="Total Rotations" value={keys.reduce((s, k) => s + k.rotations, 0).toString()} color="accent" />
      </div>

      {/* Key Manager info banner */}
      <div className="rounded-2xl border border-quantum-500/20 bg-gradient-to-br from-quantum-950/50 to-slate-900/50 p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-quantum-500/15 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-quantum-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Local Key Manager Service</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                REST API on localhost:8443 · Mutual TLS · JWT authenticated
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success-500/10 border border-success-500/20">
              <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse" />
              <span className="text-xs text-success-300 font-medium">KM Online</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Client ID</p>
              <p className="text-xs font-mono text-quantum-300">{mockCurrentUser.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Keys table */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">Cryptographic Keys</h3>
          <button
            onClick={() => setShowGenModal(true)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-quantum-600 to-accent-600 text-xs font-medium hover:from-quantum-500 hover:to-accent-500 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate New Key
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {keys.map((key) => {
            const cfg = keyStatusConfig[key.status];
            const revealed = revealedKeys.has(key.id);
            return (
              <div key={key.id} className="px-6 py-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-4">
                  {/* Algorithm icon */}
                  <div className="w-12 h-12 rounded-xl bg-quantum-500/10 text-quantum-400 flex items-center justify-center shrink-0">
                    {algorithmIcons[key.algorithm]}
                  </div>

                  {/* Key info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-white">{key.algorithm}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color} font-medium flex items-center gap-1`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-slate-600">{purposeLabels[key.purpose]}</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
                      <KeyMeta label="Key ID" value={key.id} mono />
                      <KeyMeta label="Key Size" value={key.keySize} mono />
                      <KeyMeta label="Created" value={formatDate(key.createdAt)} />
                      <KeyMeta label="Expires" value={formatDate(key.expiresAt)} />
                      <KeyMeta label="Rotations" value={key.rotations.toString()} />
                      <KeyMeta label="Standard" value={key.algorithm.startsWith('ML-KEM') ? 'FIPS 203' : key.algorithm.startsWith('ML-DSA') ? 'FIPS 204' : 'FIPS 197'} />
                    </div>

                    {/* Fingerprint */}
                    <div className="mt-3 p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-1">
                        <Fingerprint className="w-3 h-3 text-quantum-400" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Fingerprint</span>
                      </div>
                      <p className="font-mono text-xs text-quantum-300/80 break-all">{key.fingerprint}</p>
                    </div>

                    {/* Public key preview */}
                    <div className="mt-2 p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-1">
                        <KeyRound className="w-3 h-3 text-accent-400" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Public Key Preview</span>
                        <button
                          onClick={() => toggleReveal(key.id)}
                          className="ml-auto text-slate-500 hover:text-slate-300"
                        >
                          {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="font-mono text-xs text-accent-300/70 break-all">
                        {revealed ? key.publicKeyPreview : '•••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleRotate(key.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-quantum-300 hover:border-quantum-500/30 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Rotate
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-slate-300 hover:bg-white/5 transition-colors">
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-slate-300 hover:bg-white/5 transition-colors">
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      <div className="flex-1" />
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-error-400 hover:border-error-500/30 transition-colors">
                        <Trash2 className="w-3 h-3" />
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Manager architecture */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-quantum-400" />
            Key Manager Activity
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Key requests today', value: '47', icon: <KeyRound className="w-3.5 h-3.5" /> },
              { label: 'QKD key derivations', value: '23', icon: <Zap className="w-3.5 h-3.5" /> },
              { label: 'ML-KEM encapsulations', value: '31', icon: <Lock className="w-3.5 h-3.5" /> },
              { label: 'ML-DSA signatures', value: '28', icon: <Fingerprint className="w-3.5 h-3.5" /> },
              { label: 'Failed verifications', value: '0', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <span className="text-quantum-400">{stat.icon}</span>
                <span className="text-xs text-slate-400 flex-1">{stat.label}</span>
                <span className="text-xs font-mono text-white">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-accent-400" />
            Key Rotation Schedule
          </h3>
          <div className="space-y-3">
            <RotationItem algorithm="AES-256-GCM" schedule="Every 12 hours" next="in 3h 24m" urgent />
            <RotationItem algorithm="ML-KEM-768" schedule="Every 90 days" next="in 84 days" />
            <RotationItem algorithm="ML-DSA-65" schedule="Every 90 days" next="in 84 days" />
            <RotationItem algorithm="Hybrid (KEM+Sig)" schedule="Every 30 days" next="in 2 days" soon />
          </div>
        </div>
      </div>

      {/* Generate key modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => !isGenerating && setShowGenModal(false)}>
          <div className="max-w-md w-full glass border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-4">Generate New Key</h3>

            {isGenerating ? (
              <div className="py-8 text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-quantum-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-quantum-400 animate-spin" />
                  <Atom className="absolute inset-0 m-auto w-7 h-7 text-quantum-300" />
                </div>
                <p className="text-sm text-quantum-200 font-medium">Generating {genAlgorithm}...</p>
                <p className="text-xs text-slate-500 mt-1">Running lattice-based key generation</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400 mb-4">Select a post-quantum algorithm to generate a new keypair.</p>
                <div className="space-y-2 mb-6">
                  {(['ML-KEM-768', 'ML-DSA-65', 'AES-256-GCM'] as KeyAlgorithm[]).map((alg) => (
                    <button
                      key={alg}
                      onClick={() => setGenAlgorithm(alg)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        genAlgorithm === alg
                          ? 'border-quantum-500/30 bg-quantum-500/10'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="text-quantum-400">{algorithmIcons[alg]}</span>
                      <div className="text-left flex-1">
                        <p className={`text-sm font-medium ${genAlgorithm === alg ? 'text-quantum-200' : 'text-slate-300'}`}>{alg}</p>
                        <p className="text-xs text-slate-500">{purposeLabels[alg === 'ML-KEM-768' ? 'encapsulation' : alg === 'ML-DSA-65' ? 'signature' : 'symmetric']}</p>
                      </div>
                      {genAlgorithm === alg && <CheckCircle2 className="w-4 h-4 text-quantum-400" />}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowGenModal(false)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm text-slate-400 hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleGenerate} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-quantum-600 to-accent-600 text-sm font-medium hover:from-quantum-500 hover:to-accent-500 transition-all">
                    Generate
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    quantum: 'text-quantum-400 bg-quantum-500/10',
    success: 'text-success-400 bg-success-500/10',
    warning: 'text-warning-400 bg-warning-500/10',
    accent: 'text-accent-400 bg-accent-500/10',
  };
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/50 p-5">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function KeyMeta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono text-quantum-300' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}

function RotationItem({ algorithm, schedule, next, urgent, soon }: { algorithm: string; schedule: string; next: string; urgent?: boolean; soon?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${urgent ? 'bg-error-500/10 text-error-400' : soon ? 'bg-warning-500/10 text-warning-400' : 'bg-quantum-500/10 text-quantum-400'}`}>
        <Clock className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-white">{algorithm}</p>
        <p className="text-[10px] text-slate-500">{schedule}</p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-mono ${urgent ? 'text-error-300' : soon ? 'text-warning-300' : 'text-slate-400'}`}>{next}</p>
        <p className="text-[10px] text-slate-600">next rotation</p>
      </div>
    </div>
  );
}
