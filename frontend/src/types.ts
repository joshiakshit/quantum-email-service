export interface Email {
  id: number;
  folder: string;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  time: string;
  fullDate: string;
  encrypted: boolean;
  fingerprint: string;
  label: string;
  labelBg: string;
  labelColor: string;
  unread: boolean;
  avatarIdx: number;
  body: string;
}

export interface AuthState {
  token: string;
  client_id: string;
  name: string;
  email: string;
  kem_fingerprint: string;
  signing_fingerprint: string;
}

export interface FolderDef {
  id: string;
  label: string;
}

export interface SettingsTabDef {
  id: string;
  label: string;
}

export interface AvatarStyle {
  bg: string;
  color: string;
}
