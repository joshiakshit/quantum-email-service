import {
  ShieldCheck,
  Radio,
  Activity,
  KeyRound,
  BadgeCheck,
  RefreshCw,
  Mail,
  Send,
  Lock,
  Fingerprint,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  Cpu,
  Zap,
} from 'lucide-react';
import type { SecurityMetric, ActivityEvent, View } from '@/types';
import { mockSecurityMetrics, mockActivity, mockQKDLinks, mockEmails } from '@/mockData';
import { formatDate, qkdStatusConfig, encryptionStatusConfig } from '@/utils';

const iconMap: Record<string, React.ReactNode> = {
  'shield-check': <ShieldCheck className="w-5 h-5" />,
  radio: <Radio className="w-5 h-5" />,
  activity: <Activity className="w-5 h-5" />,
  key: <KeyRound className="w-5 h-5" />,
  'badge-check': <BadgeCheck className="w-5 h-5" />,
  'refresh-cw': <RefreshCw className="w-5 h-5" />,
};

const eventIcons: Record<string, React.ReactNode> = {
  'key-generated': <KeyRound className="w-3.5 h-3.5" />,
  'key-rotated': <RefreshCw className="w-3.5 h-3.5" />,
  'email-sent': <Send className="w-3.5 h-3.5" />,
  'email-received': <Mail className="w-3.5 h-3.5" />,
  'qkd-link': <Radio className="w-3.5 h-3.5" />,
  signature: <BadgeCheck className="w-3.5 h-3.5" />,
  auth: <Lock className="w-3.5 h-3.5" />,
};

const severityColors = {
  info: 'text-quantum-400 bg-quantum-500/10',
  success: 'text-success-400 bg-success-500/10',
  warning: 'text-warning-400 bg-warning-500/10',
};

export default function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const unreadCount = mockEmails.filter((e) => !e.read).length;
  const quantumSecureCount = mockEmails.filter((e) => e.encryption === 'quantum-secure').length;
  const connectedLinks = mockQKDLinks.filter((l) => l.status === 'connected').length;
  const totalKeysDistributed = mockQKDLinks.reduce((sum, l) => sum + l.keysDistributed, 0);

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Hero security status */}
      <div className="relative overflow-hidden rounded-2xl border border-quantum-500/20 bg-gradient-to-br from-quantum-950 via-slate-950 to-slate-900 p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-20" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-quantum-600/20 rounded-full blur-[100px]" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-success-400" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-success-400 animate-ping" />
              </div>
              <span className="text-xs font-medium text-success-300 uppercase tracking-wider">System Secure</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Quantum-Resistant Communication Active</h3>
            <p className="text-sm text-slate-400 max-w-lg">
              All emails are encrypted with QKD-derived session keys and post-quantum algorithms.
              Resistant to both classical and quantum adversaries.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => onNavigate('compose')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-quantum-600 to-accent-600 text-sm font-medium hover:from-quantum-500 hover:to-accent-500 transition-all shadow-lg shadow-quantum-600/20 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Compose Secure Email
              </button>
              <button
                onClick={() => onNavigate('inbox')}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                View Inbox ({unreadCount} new)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <RadialGauge value={100} label="PQC Coverage" sublabel="Quantum-Safe" />
            <RadialGauge value={2.1} label="Avg QBER" sublabel="< 11% threshold" max={11} color="accent" />
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {mockSecurityMetrics.map((m: SecurityMetric) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* QKD Links */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-quantum-400" />
                Active QKD Links
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {connectedLinks} connected · {totalKeysDistributed.toLocaleString('en-IN')} keys distributed
              </p>
            </div>
            <button
              onClick={() => onNavigate('qkd')}
              className="text-xs text-quantum-400 hover:text-quantum-300 flex items-center gap-1"
            >
              View Network <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {mockQKDLinks.map((link) => {
              const cfg = qkdStatusConfig[link.status];
              return (
                <div
                  key={link.id}
                  className="flex items-center gap-4 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                    <Radio className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{link.peerNode}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color} font-medium`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{link.peer} · {link.protocol} · {link.distance}km</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-mono text-quantum-300">{link.keyRate} kbps</p>
                      <p className="text-[10px] text-slate-600">Key Rate</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-mono ${link.qber > 5 ? 'text-warning-300' : 'text-success-300'}`}>
                        {link.qber}%
                      </p>
                      <p className="text-[10px] text-slate-600">QBER</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-400" />
              Activity
            </h3>
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Live Feed</span>
          </div>

          <div className="space-y-1 max-h-[340px] overflow-y-auto scrollbar-thin">
            {mockActivity.map((event: ActivityEvent, i) => (
              <div key={event.id} className="flex gap-3 py-2.5 animate-slide-right" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`w-7 h-7 rounded-lg ${severityColors[event.severity]} flex items-center justify-center shrink-0`}>
                  {eventIcons[event.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed">{event.message}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{formatDate(event.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent emails + Crypto info */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-quantum-400" />
              Recent Encrypted Emails
            </h3>
            <button
              onClick={() => onNavigate('inbox')}
              className="text-xs text-quantum-400 hover:text-quantum-300 flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {mockEmails.slice(0, 4).map((email) => {
              const enc = encryptionStatusConfig[email.encryption];
              return (
                <div
                  key={email.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
                  onClick={() => onNavigate('inbox')}
                >
                  <div className={`w-2 h-2 rounded-full ${enc.dot} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{email.fromName}</span>
                      {email.signed && <BadgeCheck className="w-3.5 h-3.5 text-success-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{email.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${enc.bg} ${enc.color} font-medium`}>
                      {enc.label}
                    </span>
                    <span className="text-xs text-slate-600">{formatDate(email.date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Crypto standards */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-6">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-5">
            <Cpu className="w-4 h-4 text-accent-400" />
            Crypto Standards
          </h3>
          <div className="space-y-3">
            <CryptoStandard
              name="ML-KEM-768"
              standard="FIPS 203"
              desc="Key Encapsulation"
              icon={<KeyRound className="w-4 h-4" />}
              color="quantum"
            />
            <CryptoStandard
              name="ML-DSA-65"
              standard="FIPS 204"
              desc="Digital Signature"
              icon={<Fingerprint className="w-4 h-4" />}
              color="accent"
            />
            <CryptoStandard
              name="AES-256-GCM"
              standard="FIPS 197"
              desc="Symmetric Encryption"
              icon={<Lock className="w-4 h-4" />}
              color="success"
            />
            <CryptoStandard
              name="BB84 / E91"
              standard="QKD Protocol"
              desc="Quantum Key Distribution"
              icon={<Zap className="w-4 h-4" />}
              color="warning"
            />
          </div>

          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Quantum-Secured Emails</span>
              <span className="text-success-300 font-mono">{quantumSecureCount}/{mockEmails.length}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-success-500 to-quantum-500 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RadialGauge({ value, label, sublabel, max = 100, color = 'success' }: { value: number; label: string; sublabel: string; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;
  const colors = {
    success: '#16b063',
    accent: '#02b0e6',
    quantum: '#33a8ff',
    warning: '#f59311',
  };
  const c = colors[color as keyof typeof colors] || colors.success;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle
            cx="40" cy="40" r="36" fill="none" stroke={c} strokeWidth="4"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white font-mono">{value}{max === 100 ? '%' : '%'}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-300 mt-2">{label}</span>
      <span className="text-[10px] text-slate-600">{sublabel}</span>
    </div>
  );
}

function MetricCard({ metric }: { metric: SecurityMetric }) {
  const trendIcon = metric.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : metric.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />;
  const trendColor = metric.trend === 'up' ? 'text-success-400' : metric.trend === 'down' ? 'text-warning-400' : 'text-slate-500';

  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4 hover:border-quantum-500/20 transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-quantum-500/10 text-quantum-400 flex items-center justify-center group-hover:bg-quantum-500/20 transition-colors">
          {iconMap[metric.icon]}
        </div>
        <span className={trendColor}>{trendIcon}</span>
      </div>
      <p className="text-xl font-bold text-white font-mono">{metric.value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{metric.label}</p>
      <p className="text-[10px] text-slate-600 mt-1">{metric.detail}</p>
    </div>
  );
}

function CryptoStandard({ name, standard, desc, icon, color }: { name: string; standard: string; desc: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    quantum: 'text-quantum-400 bg-quantum-500/10',
    accent: 'text-accent-400 bg-accent-500/10',
    success: 'text-success-400 bg-success-500/10',
    warning: 'text-warning-400 bg-warning-500/10',
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">{standard}</span>
        </div>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <ShieldCheck className="w-4 h-4 text-success-400/50" />
    </div>
  );
}
