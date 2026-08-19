import { useState, useEffect } from 'react';
import {
  Radio,
  Zap,
  Atom,
  Server,
  ArrowRight,
  ArrowLeftRight,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Wifi,
  Cpu,
} from 'lucide-react';
import type { QKDLink } from '@/types';
import { mockQKDLinks } from '@/mockData';
import { qkdStatusConfig, formatTime } from '@/utils';

export default function QKDNetwork() {
  const [selectedLink, setSelectedLink] = useState<QKDLink>(mockQKDLinks[0]);
  const [tickCount, setTickCount] = useState(0);
  const [keyStream, setKeyStream] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickCount((t) => t + 1);
      const hex = '0123456789ABCDEF';
      let bits = '';
      for (let i = 0; i < 8; i++) bits += hex[Math.floor(Math.random() * 16)];
      setKeyStream((prev) => [bits, ...prev].slice(0, 12));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const totalKeys = mockQKDLinks.reduce((s, l) => s + l.keysDistributed, 0);
  const avgQber = mockQKDLinks.reduce((s, l) => s + l.qber, 0) / mockQKDLinks.length;
  const avgRate = mockQKDLinks.reduce((s, l) => s + l.keyRate, 0) / mockQKDLinks.length;
  const connected = mockQKDLinks.filter((l) => l.status === 'connected').length;

  return (
    <div className="p-8 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <QKDStat icon={<Radio className="w-5 h-5" />} label="Active Links" value={`${connected}/${mockQKDLinks.length}`} color="success" />
        <QKDStat icon={<Zap className="w-5 h-5" />} label="Avg Key Rate" value={`${avgRate.toFixed(1)} kbps`} color="quantum" />
        <QKDStat icon={<Gauge className="w-5 h-5" />} label="Avg QBER" value={`${avgQber.toFixed(1)}%`} color="accent" />
        <QKDStat icon={<ShieldCheck className="w-5 h-5" />} label="Keys Distributed" value={totalKeys.toLocaleString('en-IN')} color="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Network visualization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Topology diagram */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern bg-[size:24px_24px] opacity-20" />
            <div className="relative z-10">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
                <Atom className="w-4 h-4 text-quantum-400" />
                QKD Network Topology
              </h3>
              <p className="text-xs text-slate-500 mb-6">SAC-Node-A hub · BB84 / E91 quantum channels</p>

              {/* SVG topology */}
              <div className="relative h-80 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 320">
                  {/* Lines from center to nodes */}
                  {mockQKDLinks.map((link, i) => {
                    const angle = (i / mockQKDLinks.length) * 2 * Math.PI - Math.PI / 2;
                    const x = 300 + Math.cos(angle) * 200;
                    const y = 160 + Math.sin(angle) * 120;
                    const colors = {
                      connected: '#16b063',
                      syncing: '#33a8ff',
                      degraded: '#f59311',
                      disconnected: '#ef4444',
                    };
                    const c = colors[link.status];
                    return (
                      <g key={link.id}>
                        <line x1="300" y1="160" x2={x} y2={y} stroke={c} strokeWidth="2" strokeDasharray="5,5" opacity="0.4">
                          <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                        </line>
                        <circle cx={x} cy={y} r="4" fill={c} opacity="0.6">
                          <animate attributeName="r" from="3" to="6" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      </g>
                    );
                  })}
                  {/* Central node pulse */}
                  <circle cx="300" cy="160" r="40" fill="rgba(51,168,255,0.1)" />
                  <circle cx="300" cy="160" r="30" fill="rgba(51,168,255,0.15)" stroke="#33a8ff" strokeWidth="1.5" />
                </svg>

                {/* Central node */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-quantum-500 to-accent-600 flex items-center justify-center shadow-lg shadow-quantum-500/30 animate-glow">
                    <Server className="w-8 h-8 text-white" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-white mt-2">SAC-Node-A</span>
                  <span className="text-[10px] text-slate-500">Your Node</span>
                </div>

                {/* Peer nodes positioned around */}
                {mockQKDLinks.map((link, i) => {
                  const angle = (i / mockQKDLinks.length) * 2 * Math.PI - Math.PI / 2;
                  const left = `${50 + (Math.cos(angle) * 33)}%`;
                  const top = `${50 + (Math.sin(angle) * 38)}%`;
                  const cfg = qkdStatusConfig[link.status];
                  return (
                    <div
                      key={link.id}
                      className="absolute flex flex-col items-center cursor-pointer group"
                      style={{ left, top, transform: 'translate(-50%, -50%)' }}
                      onClick={() => setSelectedLink(link)}
                    >
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.color.replace('text-', 'border-').replace('-300', '-500/30')} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Radio className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 font-mono whitespace-nowrap">{link.peerNode}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Link list */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Quantum Channels</h3>
            </div>
            <div className="divide-y divide-white/5">
              {mockQKDLinks.map((link) => {
                const cfg = qkdStatusConfig[link.status];
                const isSelected = selectedLink.id === link.id;
                return (
                  <div
                    key={link.id}
                    onClick={() => setSelectedLink(link)}
                    className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors ${isSelected ? 'bg-quantum-500/5' : 'hover:bg-white/[0.02]'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                      <Radio className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{link.peerNode}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{link.protocol} · {link.distance} km · {link.peer}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs font-mono text-quantum-300">{link.keyRate} kbps</p>
                        <p className="text-[10px] text-slate-600">Rate</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-mono ${link.qber > 5 ? 'text-warning-300' : 'text-success-300'}`}>{link.qber}%</p>
                        <p className="text-[10px] text-slate-600">QBER</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected link detail */}
        <div className="space-y-4">
          {/* Link details */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftRight className="w-4 h-4 text-quantum-400" />
              <h3 className="text-sm font-semibold text-white">Channel Details</h3>
            </div>

            <div className="space-y-3">
              <DetailRow label="Peer Node" value={selectedLink.peerNode} />
              <DetailRow label="Peer Address" value={selectedLink.peer} mono />
              <DetailRow label="Protocol" value={selectedLink.protocol} />
              <DetailRow label="Distance" value={`${selectedLink.distance} km`} />
              <DetailRow label="Status" value={qkdStatusConfig[selectedLink.status].label} />
              <DetailRow label="Established" value={formatTime(selectedLink.establishedAt)} />
              <DetailRow label="Keys Distributed" value={selectedLink.keysDistributed.toLocaleString('en-IN')} mono />
            </div>

            {/* QBER gauge */}
            <div className="mt-5 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">QBER (Quantum Bit Error Rate)</span>
                <span className={`text-xs font-mono ${selectedLink.qber > 5 ? 'text-warning-300' : 'text-success-300'}`}>{selectedLink.qber}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    selectedLink.qber > 8 ? 'bg-error-500' : selectedLink.qber > 5 ? 'bg-warning-500' : 'bg-success-500'
                  }`}
                  style={{ width: `${Math.min((selectedLink.qber / 11) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-600">0%</span>
                <span className="text-[10px] text-slate-600">Threshold: 11%</span>
              </div>
            </div>

            {/* Key rate meter */}
            <div className="mt-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Key Generation Rate</span>
                <span className="text-xs font-mono text-quantum-300">{selectedLink.keyRate} kbps</span>
              </div>
              <div className="flex items-end gap-1 h-12">
                {Array.from({ length: 24 }).map((_, i) => {
                  const height = 30 + Math.sin(i + tickCount * 0.5) * 20 + Math.random() * 30;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-quantum-600/40 to-quantum-400/80 transition-all duration-700"
                      style={{ height: `${Math.max(10, Math.min(100, height))}%` }}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-600 mt-2">Real-time key rate (last 24 samples)</p>
            </div>
          </div>

          {/* Live key stream */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-accent-400" />
                <h3 className="text-sm font-semibold text-white">Live Key Stream</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
                <span className="text-[10px] text-success-300">Streaming</span>
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {keyStream.map((key, i) => (
                <div
                  key={`${tickCount}-${i}`}
                  className="flex items-center gap-3 p-2 rounded-lg border border-white/5 bg-white/[0.02] animate-slide-right"
                  style={{ animationDelay: `${i * 30}ms`, opacity: 1 - i * 0.07 }}
                >
                  <span className="text-slate-600 text-[10px]">{String(tickCount - i).padStart(4, '0')}</span>
                  <span className="text-accent-300">{key}</span>
                  <ArrowRight className="w-3 h-3 text-slate-600 ml-auto" />
                  <span className="text-success-400 text-[10px]">OK</span>
                </div>
              ))}
              {keyStream.length === 0 && (
                <p className="text-slate-600 text-xs text-center py-4">Waiting for key stream...</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] text-slate-500">
                Sifted keys from BB84 basis reconciliation
              </span>
            </div>
          </div>

          {/* Security indicator */}
          <div className={`rounded-xl border p-4 ${selectedLink.qber < 5 ? 'border-success-500/20 bg-success-500/5' : 'border-warning-500/20 bg-warning-500/5'}`}>
            <div className="flex gap-3">
              {selectedLink.qber < 5 ? (
                <ShieldCheck className="w-5 h-5 text-success-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning-400 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${selectedLink.qber < 5 ? 'text-success-300' : 'text-warning-300'}`}>
                  {selectedLink.qber < 5 ? 'Channel Secure' : 'Elevated Error Rate'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedLink.qber < 5
                    ? 'QBER is well below the 11% threshold. No eavesdropping detected.'
                    : 'QBER is above 5%. Possible interference. Key rate reduced as precaution.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QKDStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    quantum: 'text-quantum-400 bg-quantum-500/10',
    success: 'text-success-400 bg-success-500/10',
    warning: 'text-warning-400 bg-warning-500/10',
    accent: 'text-accent-400 bg-accent-500/10',
  };
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/50 p-5">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-xl font-bold text-white font-mono">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono text-quantum-300' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}
