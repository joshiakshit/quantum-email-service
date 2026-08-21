import { useState, useEffect, useCallback, useMemo } from 'react';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import RightRail from '@/components/RightRail';
import MessageList from '@/components/MessageList';
import MessageView from '@/components/MessageView';
import SettingsPanel from '@/components/SettingsPanel';
import ComposeModal from '@/components/ComposeModal';
import KeyManagementModal from '@/components/KeyManagementModal';
import AuthScreen from '@/components/AuthScreen';
import LockScreen from '@/components/LockScreen';
import { FOLDER_IDS, FOLDER_LABELS } from '@/data';
import * as api from '@/api';
import * as session from '@/session';
import type { Email, AuthState, ComposeDraft } from './types';

async function decryptEmail(raw: api.RawEmail, kemFingerprint: string): Promise<Email> {
  let body: string;
  let encrypted: boolean;
  try {
    body = await session.open(raw.envelope, raw.senderVerifyKey);
    encrypted = true;
  } catch {
    body = '(unable to decrypt this message)';
    encrypted = false;
  }
  return {
    id: raw.id,
    folder: raw.folder,
    sender: raw.sender,
    senderEmail: raw.senderEmail,
    subject: raw.subject,
    time: raw.time,
    fullDate: raw.fullDate,
    unread: raw.unread,
    avatarIdx: raw.avatarIdx,
    label: raw.label,
    labelBg: raw.labelBg,
    labelColor: raw.labelColor,
    body,
    preview: body.slice(0, 80) + (body.length > 80 ? '…' : ''),
    encrypted,
    fingerprint: encrypted ? kemFingerprint : '',
  };
}

const SIDEBAR_W = 272;
const SIDEBAR_W_COLLAPSED = 68;

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

function quote(email: Email) {
  return `\n\n---\nOn ${email.fullDate}, ${email.sender} <${email.senderEmail}> wrote:\n${email.body}`;
}

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [unlocked, setUnlocked] = useState(session.isUnlocked());
  const [authChecked, setAuthChecked] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [activeFolder, setActiveFolder] = useState('inbox');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [category, setCategory] = useState('primary');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [starred, setStarred] = useState<Set<number>>(new Set());
  const [readState, setReadState] = useState<Record<number, boolean>>({});

  const [compose, setCompose] = useState<ComposeDraft | null>(null);
  const [composeKey, setComposeKey] = useState(0);
  const [keyPanelOpen, setKeyPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('security');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('qmail_nav') === 'collapsed');

  useEffect(() => {
    localStorage.setItem('qmail_nav', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

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

  const kemFingerprint = auth?.kem_fingerprint ?? '';

  const fetchEmails = useCallback(async (folder: string) => {
    setRefreshing(true);
    try {
      const data = await api.getEmails(folder);
      const decrypted = await Promise.all(
        data.emails.map(raw => decryptEmail(raw, kemFingerprint)),
      );
      setEmails(prev => {
        const other = prev.filter(e => e.folder !== folder);
        return [...other, ...decrypted];
      });
    } catch { /* gateway not running */ }
    setRefreshing(false);
  }, [kemFingerprint]);

  useEffect(() => {
    if (auth && unlocked) fetchEmails(activeFolder);
  }, [auth, unlocked, activeFolder, fetchEmails]);

  const isUnread = useCallback(
    (email: Email) => readState[email.id] ?? email.unread,
    [readState],
  );

  const query = search.trim().toLowerCase();

  const listed = useMemo(() => {
    const base = query
      ? emails
      : activeFolder === 'starred'
        ? emails.filter(e => starred.has(e.id))
        : emails.filter(e => e.folder === activeFolder);
    return base
      .filter(e => !activeLabel || e.label === activeLabel)
      .filter(e => !query || (e.sender + e.subject + e.preview + e.body).toLowerCase().includes(query));
  }, [emails, activeFolder, activeLabel, query, starred]);

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const fid of FOLDER_IDS) {
      counts[fid] = emails.filter(e => (fid === 'starred' ? starred.has(e.id) : e.folder === fid) && isUnread(e)).length;
    }
    return counts;
  }, [emails, starred, isUnread]);

  const openEmail = openId === null ? null : emails.find(e => e.id === openId) ?? null;
  const openIndex = openEmail ? listed.findIndex(e => e.id === openEmail.id) : -1;

  function markRead(ids: number[], read: boolean) {
    setReadState(prev => {
      const next = { ...prev };
      for (const id of ids) next[id] = !read;
      return next;
    });
    if (read) setSelected(new Set());
  }

  function toggleStar(id: number) {
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectMany(ids: number[], on: boolean) {
    setSelected(prev => {
      const next = new Set(prev);
      for (const id of ids) { if (on) next.add(id); else next.delete(id); }
      return next;
    });
  }

  function openMessage(id: number) {
    setOpenId(id);
    markRead([id], true);
  }

  function selectFolder(id: string) {
    setActiveFolder(id);
    setActiveLabel(null);
    setOpenId(null);
    setSelected(new Set());
    setSettingsOpen(false);
    setSearch('');
  }

  function selectLabel(name: string | null) {
    setActiveLabel(name);
    setOpenId(null);
    setSettingsOpen(false);
  }

  function startCompose(draft: ComposeDraft) {
    setCompose(draft);
    setComposeKey(k => k + 1);
  }

  async function handleSend(to: string, subject: string, body: string) {
    if (!auth) return;
    const recipient = await api.lookupRecipient(to);
    const recipientEnvelope = await session.seal(body, auth.client_id, recipient, subject);
    const self = { client_id: auth.client_id, ...session.publicKeys() };
    const selfEnvelope = await session.seal(body, auth.client_id, self, subject);
    await api.sendEmail(to, subject, recipientEnvelope, selfEnvelope);
    setCompose(null);
    fetchEmails('sent');
  }

  async function handleLogout() {
    try { await api.logout(); } catch { /* session already gone */ }
    localStorage.removeItem('qmail_token');
    session.lock();
    setUnlocked(false);
    setAuth(null);
    setEmails([]);
    setOpenId(null);
    setSettingsOpen(false);
  }

  function handleAuthenticated(a: AuthState) {
    setAuth(a);
    setUnlocked(session.isUnlocked());
  }

  if (!authChecked) {
    return <div style={{ width: '100vw', height: '100vh', background: 'var(--bg)' }} />;
  }

  if (!auth) return <AuthScreen onAuth={handleAuthenticated} />;

  if (!unlocked) {
    return <LockScreen auth={auth} onUnlocked={handleAuthenticated} onLogout={handleLogout} />;
  }

  const navWidth = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;
  const listTitle = query
    ? `Search: ${search.trim()}`
    : activeLabel ?? FOLDER_LABELS[activeFolder] ?? activeFolder;

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', color: 'var(--fg)',
      fontFamily: 'var(--font-sans)', overflow: 'hidden',
    }}>
      <TopBar
        auth={auth}
        search={search}
        brandWidth={navWidth}
        theme={theme}
        onSearchChange={setSearch}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => { setSettingsOpen(true); setSettingsTab('security'); }}
        onOpenKeyPanel={() => setKeyPanelOpen(true)}
        onLogout={handleLogout}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar
          collapsed={collapsed}
          width={navWidth}
          activeFolder={activeFolder}
          activeLabel={activeLabel}
          settingsOpen={settingsOpen}
          unreadCounts={unreadCounts}
          refreshing={refreshing}
          auth={auth}
          onToggleCollapsed={() => setCollapsed(c => !c)}
          onSelectFolder={selectFolder}
          onSelectLabel={selectLabel}
          onOpenCompose={() => startCompose({ to: '', subject: '', body: '' })}
          onRefresh={() => fetchEmails(activeFolder)}
        />

        <main style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-l)', marginBottom: 8,
        }}>
          {settingsOpen ? (
            <SettingsPanel
              auth={auth}
              activeTab={settingsTab}
              onTabChange={setSettingsTab}
              onClose={() => setSettingsOpen(false)}
            />
          ) : openEmail ? (
            <MessageView
              email={openEmail}
              starred={starred.has(openEmail.id)}
              hasPrev={openIndex > 0}
              hasNext={openIndex >= 0 && openIndex < listed.length - 1}
              onBack={() => setOpenId(null)}
              onToggleStar={() => toggleStar(openEmail.id)}
              onMarkUnread={() => { markRead([openEmail.id], false); setOpenId(null); }}
              onPrev={() => openMessage(listed[openIndex - 1].id)}
              onNext={() => openMessage(listed[openIndex + 1].id)}
              onReply={() => startCompose({
                to: openEmail.senderEmail,
                subject: `Re: ${openEmail.subject}`,
                body: quote(openEmail),
              })}
              onReplyAll={() => startCompose({
                to: openEmail.senderEmail,
                subject: `Re: ${openEmail.subject}`,
                body: quote(openEmail),
              })}
              onForward={() => startCompose({
                to: '',
                subject: `Fw: ${openEmail.subject}`,
                body: quote(openEmail),
              })}
            />
          ) : (
            <MessageList
              folderLabel={listTitle}
              emails={listed}
              category={category}
              unreadOnly={unreadOnly}
              selected={selected}
              starred={starred}
              refreshing={refreshing}
              isUnread={isUnread}
              onCategoryChange={setCategory}
              onToggleUnreadOnly={() => setUnreadOnly(v => !v)}
              onToggleSelect={toggleSelect}
              onSelectMany={selectMany}
              onToggleStar={toggleStar}
              onOpen={openMessage}
              onMarkRead={markRead}
              onRefresh={() => fetchEmails(activeFolder)}
            />
          )}
        </main>

        <RightRail
          theme={theme}
          onOpenKeyPanel={() => setKeyPanelOpen(true)}
          onOpenSecurity={() => { setSettingsOpen(true); setSettingsTab('security'); }}
          onToggleTheme={toggleTheme}
        />
      </div>

      {compose && (
        <ComposeModal
          key={composeKey}
          fromEmail={auth.email}
          initial={compose}
          onClose={() => setCompose(null)}
          onSend={handleSend}
        />
      )}

      {keyPanelOpen && (
        <KeyManagementModal auth={auth} onClose={() => setKeyPanelOpen(false)} />
      )}
    </div>
  );
}
