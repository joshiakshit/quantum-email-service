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

  useEffect(() => {
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

  function handleAuth(data: api.AuthResponse) {
    setAuth(data);
  }

  if (!auth) return <AuthScreen onAuth={handleAuth} />;

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
      />

      {settingsOpen ? (
        <SettingsPanel
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
