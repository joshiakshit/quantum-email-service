import {
  LayoutDashboard,
  Inbox,
  PenLine,
  KeyRound,
  Radio,
  Settings,
  Atom,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import type { View, User } from '@/types';
import { getInitials } from '@/utils';

const navItems: { view: View; label: string; icon: React.ReactNode; badge?: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { view: 'inbox', label: 'Inbox', icon: <Inbox className="w-[18px] h-[18px]" />, badge: '2' },
  { view: 'compose', label: 'Compose', icon: <PenLine className="w-[18px] h-[18px]" /> },
  { view: 'keys', label: 'Key Manager', icon: <KeyRound className="w-[18px] h-[18px]" /> },
  { view: 'qkd', label: 'QKD Network', icon: <Radio className="w-[18px] h-[18px]" /> },
  { view: 'settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" /> },
];

export default function Sidebar({
  current,
  onNavigate,
  user,
  onLogout,
}: {
  current: View;
  onNavigate: (v: View) => void;
  user: User;
  onLogout: () => void;
}) {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-slate-950 border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-quantum-500 to-accent-600 flex items-center justify-center shadow-lg shadow-quantum-500/20">
            <Atom className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">QuMail</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Quantum-Secure</p>
          </div>
        </div>
      </div>

      {/* Security status banner */}
      <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-br from-success-500/10 to-quantum-500/10 border border-success-500/20">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-success-400" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-success-400 animate-ping" />
          </div>
          <span className="text-xs font-medium text-success-300">Quantum-Secure</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5">All channels PQC-encrypted</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const active = current === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'bg-gradient-to-r from-quantum-600/20 to-accent-600/10 text-white border border-quantum-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={active ? 'text-quantum-300' : 'text-slate-500 group-hover:text-slate-300'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-quantum-500/20 text-quantum-300">
                  {item.badge}
                </span>
              )}
              {active && <ChevronRight className="w-3.5 h-3.5 text-quantum-400" />}
            </button>
          );
        })}
      </nav>

      {/* User card */}
      <div className="px-3 pb-3">
        <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${user.avatarColor} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
              {getInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-success-400" />
            <span className="text-[10px] text-slate-500 font-mono">{user.keyId}</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-error-400 hover:bg-error-500/5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
