import type { Email, AvatarStyle } from './types';

export const FOLDER_IDS = ['inbox', 'sent', 'drafts', 'starred', 'archive', 'trash'] as const;

export const FOLDER_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  starred: 'Starred',
  archive: 'Archive',
  trash: 'Trash',
};

export const SETTINGS_TABS = [
  { id: 'security', label: 'Encryption & Security' },
  { id: 'account', label: 'Account' },
  { id: 'privacy', label: 'Privacy & Logs' },
] as const;

export const AVATARS: AvatarStyle[] = [
  { bg: 'var(--color-accent-800)', color: 'var(--color-accent-200)' },
  { bg: '#1a3a4a', color: '#6fa8dc' },
  { bg: '#3a1a2a', color: '#e06666' },
  { bg: '#1a3a2a', color: '#93c47d' },
];

export const LABELS = [
  { name: 'Classified', color: '#e06666' },
  { name: 'Mission Critical', color: '#6fa8dc' },
  { name: 'Cleared', color: '#93c47d' },
];

export const EMAILS: Email[] = [
  {
    id: 1, folder: 'inbox',
    sender: 'Dr. Ananya Rao', senderEmail: 'ananya.rao@isro.gov.in',
    subject: 'Cryogenic Stage Test Report — Q3',
    preview: 'Attached is the final report following the hot test at Mahendragiri…',
    time: '09:42', fullDate: 'Today, 19 Aug 2026 at 09:42 IST',
    encrypted: true, fingerprint: '3F2A:9C1B:7E44:0AD2',
    label: 'Mission Critical', labelBg: 'rgba(111,168,220,0.15)', labelColor: '#6fa8dc',
    unread: true, avatarIdx: 0,
    body: 'Team,\n\nAttached is the final report following the hot test at Mahendragiri. All parameters were nominal within the expected envelope; chamber pressure held steady across the full 640s burn.\n\nPlease review section 4 before the design review on Thursday. The thermal margins on the injector face are tighter than modelled — see page 12 for the revised analysis.\n\n— Ananya',
  },
  {
    id: 2, folder: 'inbox',
    sender: 'Mission Control — VSSC', senderEmail: 'missioncontrol@vssc.isro.gov.in',
    subject: 'Launch Window Confirmation: PSLV-C61',
    preview: 'The revised launch window has been confirmed by range safety…',
    time: '08:15', fullDate: 'Today, 19 Aug 2026 at 08:15 IST',
    encrypted: true, fingerprint: 'A11C:5590:2FA8:D31E',
    label: 'Classified', labelBg: 'rgba(224,102,102,0.15)', labelColor: '#e06666',
    unread: true, avatarIdx: 1,
    body: 'The revised launch window has been confirmed by range safety for 05:58 IST, 23 Aug 2026. All stage clearances are logged. Weather advisory attached separately.\n\nFinal readiness review at 18:00 today. All division heads to attend via secure channel.',
  },
  {
    id: 3, folder: 'inbox',
    sender: 'Rajesh Kumar', senderEmail: 'r.kumar@isro.gov.in',
    subject: 'Budget approval pending signature',
    preview: 'Could you countersign the Q4 procurement request by Friday…',
    time: 'Yesterday', fullDate: '18 Aug 2026 at 16:30 IST',
    encrypted: false, fingerprint: '',
    label: '', labelBg: '', labelColor: '',
    unread: false, avatarIdx: 2,
    body: 'Could you countersign the Q4 procurement request by Friday? Finance is waiting to release the PO for the new test-stand instrumentation.\n\nThanks,\nRajesh',
  },
  {
    id: 4, folder: 'inbox',
    sender: 'Key Manager Service', senderEmail: 'noreply@keymanager.gov.in',
    subject: 'Signing key rotation due in 5 days',
    preview: 'Your ML-DSA-65 signing key will expire on schedule…',
    time: 'Yesterday', fullDate: '18 Aug 2026 at 06:00 IST',
    encrypted: true, fingerprint: '0C7D:E812:449A:9B03',
    label: '', labelBg: '', labelColor: '',
    unread: false, avatarIdx: 3,
    body: 'This is an automated notice from the QMail Key Manager.\n\nYour ML-DSA-65 signing key will expire on schedule in 5 days (2026-08-24). Regenerate your keys from Settings → Key Management to avoid interruption to signed mail delivery.\n\nNo action is needed for your KEM key at this time.',
  },
  {
    id: 5, folder: 'inbox',
    sender: 'ISTRAC Network Ops', senderEmail: 'netops@istrac.isro.gov.in',
    subject: 'Scheduled maintenance: QKD backbone — 22 Aug',
    preview: 'The quantum key distribution backbone will undergo planned maintenance…',
    time: '16 Aug', fullDate: '16 Aug 2026 at 11:20 IST',
    encrypted: true, fingerprint: 'F901:22B3:8E7D:1A45',
    label: '', labelBg: '', labelColor: '',
    unread: false, avatarIdx: 1,
    body: 'The quantum key distribution backbone between Bengaluru and Thiruvananthapuram will undergo planned maintenance on 22 Aug, 02:00–06:00 IST.\n\nDuring this window, emails between VSSC and ISAC will fall back to classical hybrid encryption (X25519 + AES-256-GCM). Full PQC coverage will resume automatically once the QKD link is restored.',
  },
  {
    id: 6, folder: 'sent',
    sender: 'You', senderEmail: 'v.krishnan@isro.gov.in',
    subject: 'Re: Telemetry anomaly — Sector 7',
    preview: 'Confirmed, the anomaly was a sensor calibration drift…',
    time: 'Mon', fullDate: '18 Aug 2026 at 10:14 IST',
    encrypted: true, fingerprint: 'E290:114C:AC7D:6650',
    label: '', labelBg: '', labelColor: '',
    unread: false, avatarIdx: 0,
    body: 'Confirmed, the anomaly was a sensor calibration drift, not a structural issue. Recalibration scheduled for tomorrow 06:00.\n\nThe telemetry team has updated the baseline parameters in ISTRAC-DB.',
  },
  {
    id: 7, folder: 'drafts',
    sender: 'You', senderEmail: 'v.krishnan@isro.gov.in',
    subject: '(no subject)',
    preview: 'Draft — not yet sent',
    time: 'Draft', fullDate: '',
    encrypted: false, fingerprint: '',
    label: '', labelBg: '', labelColor: '',
    unread: false, avatarIdx: 0,
    body: '',
  },
  {
    id: 8, folder: 'trash',
    sender: 'IT Helpdesk', senderEmail: 'helpdesk@isro.gov.in',
    subject: 'Password expiry notice',
    preview: 'Your directory password will expire in 3 days…',
    time: '3 days ago', fullDate: '16 Aug 2026 at 09:00 IST',
    encrypted: false, fingerprint: '',
    label: '', labelBg: '', labelColor: '',
    unread: false, avatarIdx: 3,
    body: 'Your directory password will expire in 3 days. Please update it via the internal portal at https://identity.isro.gov.in.',
  },
];

export function getInitials(name: string): string {
  if (name === 'You') return 'VK';
  return name.split(' ').map(w => w[0]).filter(c => /[A-Z]/.test(c)).slice(0, 2).join('');
}
