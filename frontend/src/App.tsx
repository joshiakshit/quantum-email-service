import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import InboxView from '@/components/InboxView';
import SettingsPanel from '@/components/SettingsPanel';
import ComposeModal from '@/components/ComposeModal';
import KeyManagementModal from '@/components/KeyManagementModal';
import AuthScreen from '@/components/AuthScreen';
import * as api from '@/api';
import type { Email, AuthState } from './types';

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [keyPanelOpen, setKeyPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('security');
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const authToken = hash.slice(7);
      window.history.replaceState(null, '', '/');
      setExchanging(true);
      api.exchangeToken(authToken)
        .then(data => {
          localStorage.setItem('qumail_token', data.token);
          setAuth(data);
        })
        .catch(() => {})
        .finally(() => setExchanging(false));
      return;
    }

    const token = localStorage.getItem('qumail_token');
    if (token) {
      api.getAuthStatus()
        .then(data => setAuth({ token, ...data }))
        .catch(() => localStorage.removeItem('qumail_token'));
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
    localStorage.removeItem('qumail_token');
    setAuth(null);
    setEmails([]);
    setSelectedId(null);
    setSettingsOpen(false);
  }

  if (!auth) return <AuthScreen exchanging={exchanging} />;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-body)',
        overflow: 'hidden',
      }}
    >
      <Sidebar
        activeFolder={activeFolder}
        settingsOpen={settingsOpen}
        emails={emails}
        auth={auth}
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
