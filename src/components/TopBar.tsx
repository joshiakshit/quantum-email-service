import { Search, Bell, Activity } from 'lucide-react';
import type { View } from '@/types';

const titles: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Security Dashboard', subtitle: 'Real-time overview of your quantum-secure communications' },
  inbox: { title: 'Encrypted Inbox', subtitle: 'Quantum-secured email messages' },
  compose: { title: 'Compose Encrypted Email', subtitle: 'End-to-end quantum-secure messaging' },
  keys: { title: 'Key Manager', subtitle: 'Post-quantum cryptographic key management' },
  qkd: { title: 'QKD Network', subtitle: 'Quantum Key Distribution channel monitoring' },
  settings: { title: 'Settings', subtitle: 'Configure your quantum-secure email client' },
};

export default function TopBar({ view }: { view: View }) {
  const { title, subtitle } = titles[view];
  return (
    <header className="sticky top-0 z-20 glass border-b border-white/5 px-8 py-4">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/5 bg-white/[0.02] w-64">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search encrypted mail..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-600"
            />
            <kbd className="text-[10px] text-slate-600 font-mono px-1.5 py-0.5 rounded border border-white/5">⌘K</kbd>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-success-500/20 bg-success-500/5">
            <Activity className="w-4 h-4 text-success-400" />
            <span className="text-xs font-medium text-success-300">Live</span>
          </div>

          <button className="relative p-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors">
            <Bell className="w-4 h-4 text-slate-400" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-quantum-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
