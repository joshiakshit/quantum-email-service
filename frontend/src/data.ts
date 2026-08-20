import type { AvatarStyle } from './types';

export const PRIMARY_FOLDERS = ['inbox', 'drafts', 'sent', 'starred'] as const;
export const MORE_FOLDERS = ['archive', 'trash'] as const;
export const FOLDER_IDS = [...PRIMARY_FOLDERS, ...MORE_FOLDERS];

export const FOLDER_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  starred: 'Starred',
  archive: 'Archive',
  trash: 'Trash',
};

export const CATEGORIES = [
  { id: 'primary', label: 'Primary' },
  { id: 'encrypted', label: 'Encrypted' },
  { id: 'unverified', label: 'Unverified' },
] as const;

export const SETTINGS_TABS = [
  { id: 'security', label: 'Encryption & Security' },
  { id: 'account', label: 'Account' },
  { id: 'privacy', label: 'Privacy & Logs' },
] as const;

export const AVATARS: AvatarStyle[] = [
  { bg: 'var(--accent-bg)', color: 'var(--accent-fg)' },
  { bg: 'rgba(56, 189, 248, 0.14)', color: '#38bdf8' },
  { bg: 'rgba(244, 114, 182, 0.14)', color: '#f472b6' },
  { bg: 'rgba(47, 180, 146, 0.14)', color: '#2fb492' },
];

export const LABELS = [
  { name: 'Classified', color: '#ef4444' },
  { name: 'Mission Critical', color: '#6fa8dc' },
  { name: 'Cleared', color: '#22c55e' },
];

export function getInitials(name: string): string {
  if (name === 'You') return 'ME';
  const caps = name.split(' ').map(w => w[0]).filter(c => /[A-Z]/.test(c)).slice(0, 2).join('');
  return caps || name.slice(0, 2).toUpperCase();
}
