import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import InboxView from '@/components/InboxView';
import SettingsPanel from '@/components/SettingsPanel';
import ComposeModal from '@/components/ComposeModal';
import KeyManagementModal from '@/components/KeyManagementModal';

export default function App() {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [keyPanelOpen, setKeyPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('security');

  function selectFolder(id: string) {
    setActiveFolder(id);
    setSelectedId(null);
    setSettingsOpen(false);
  }

  function openSettings() {
    setSettingsOpen(true);
    setSettingsTab('security');
  }

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
        onSelectFolder={selectFolder}
        onOpenCompose={() => setComposeOpen(true)}
        onOpenKeyPanel={() => setKeyPanelOpen(true)}
        onOpenSettings={openSettings}
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
          onSelectEmail={setSelectedId}
          onSearchChange={setSearch}
        />
      )}

      {composeOpen && (
        <ComposeModal onClose={() => setComposeOpen(false)} />
      )}

      {keyPanelOpen && (
        <KeyManagementModal onClose={() => setKeyPanelOpen(false)} />
      )}
    </div>
  );
}
