import { useState } from 'react';
import AuthScreen from '@/components/AuthScreen';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import Dashboard from '@/components/Dashboard';
import InboxView from '@/components/InboxView';
import ComposeView from '@/components/ComposeView';
import KeyManager from '@/components/KeyManager';
import QKDNetwork from '@/components/QKDNetwork';
import SettingsView from '@/components/SettingsView';
import { mockCurrentUser } from '@/mockData';
import type { View } from '@/types';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<View>('dashboard');

  if (!authed) {
    return <AuthScreen onAuthenticated={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar current={view} onNavigate={setView} user={mockCurrentUser} onLogout={() => setAuthed(false)} />
      <main className="flex-1 min-w-0 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900">
        <TopBar view={view} />
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'inbox' && <InboxView onCompose={() => setView('compose')} />}
        {view === 'compose' && <ComposeView onSent={() => setView('inbox')} />}
        {view === 'keys' && <KeyManager />}
        {view === 'qkd' && <QKDNetwork />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
