import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import InboxView from '@/components/InboxView';
import SettingsPanel from '@/components/SettingsPanel';
import ComposeModal from '@/components/ComposeModal';
import KeyManagementModal from '@/components/KeyManagementModal';
import AuthScreen from '@/components/AuthScreen';
import * as api from '@/api';
import type { Email, AuthState } from './types';

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('qmail_theme');
    return stored === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('qmail_theme', theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  return { theme, toggle };
}

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [keyPanelOpen, setKeyPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('security');

  useEffect(() => {
    const token = localStorage.getItem('qmail_token');
    if (token) {
      api.getAuthStatus()
        .then(data => setAuth({ token, ...data }))
        .catch(() => localStorage.removeItem('qmail_token'))
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  const fetchEmails = useCallback(async (folder: string) => {
    try {
      const data = await api.getEmails(folder);
      setEmails(prev => {
        const other = prev.filter(e => e.folder !== folder);
        return [...other, ...data.emails];
      });
    } catch { /* gateway not running */ }
  }, []);

  useEffect(() => {
    if (auth) fetchEmails(activeFolder);
  }, [auth, activeFolder, fetchEmails]);

  function selectFolder(id: string) {
    setActiveFolder(id);
    setSelectedId(null);
    setSettingsOpen(false);
  }

  async function handleSend(to: string, subject: string, body: string) {
    await api.sendEmail(to, subject, body);
    setComposeOpen(false);
    fetchEmails('sent');
  }

  async function handleLogout() {
    try { await api.logout(); } catch {}
    localStorage.removeItem('qmail_token');
    setAuth(null);
    setEmails([]);
    setSelectedId(null);
    setSettingsOpen(false);
  }

  if (!authChecked) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }} />
    );
  }

  if (!auth) return <AuthScreen onAuth={setAuth} />;

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex',
      background: 'var(--bg)', color: 'var(--fg)',
      fontFamily: 'var(--font-sans)', overflow: 'hidden',
    }}>
      <Sidebar
        activeFolder={activeFolder}
        settingsOpen={settingsOpen}
        emails={emails}
        auth={auth}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelectFolder={selectFolder}
        onOpenCompose={() => setComposeOpen(true)}
        onOpenKeyPanel={() => setKeyPanelOpen(true)}
        onOpenSettings={() => { setSettingsOpen(true); setSettingsTab('security'); }}
        onLogout={handleLogout}
      />

      {settingsOpen ? (
        <SettingsPanel
          auth={auth}
          activeTab={settingsTab}
          onTabChange={setSettingsTab}
          onClose={() => setSettingsOpen(false)}
        />
      ) : (
        <InboxView
          activeFolder={activeFolder}
          selectedId={selectedId}
          search={search}
          emails={emails}
          onSelectEmail={setSelectedId}
          onSearchChange={setSearch}
        />
      )}

      {composeOpen && (
        <ComposeModal onClose={() => setComposeOpen(false)} onSend={handleSend} />
      )}

      {keyPanelOpen && (
        <KeyManagementModal auth={auth} onClose={() => setKeyPanelOpen(false)} />
      )}
    </div>
  );
}
