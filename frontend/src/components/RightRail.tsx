import { Key, ShieldCheck, Sun, Moon } from 'lucide-react';

interface Props {
  theme: 'dark' | 'light';
  onOpenKeyPanel: () => void;
  onOpenSecurity: () => void;
  onToggleTheme: () => void;
}

export default function RightRail({ theme, onOpenKeyPanel, onOpenSecurity, onToggleTheme }: Props) {
  return (
    <div style={{
      width: 'var(--rail-w)', flex: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6, padding: '10px 0',
    }}>
      <button className="rail-btn" title="Key management" onClick={onOpenKeyPanel}
        style={{ background: 'var(--accent-bg)', color: 'var(--accent-fg)' }}>
        <Key size={17} strokeWidth={1.8} />
      </button>
      <button className="rail-btn" title="Encryption & security" onClick={onOpenSecurity}
        style={{ background: 'var(--green-bg)', color: 'var(--green-fg)' }}>
        <ShieldCheck size={17} strokeWidth={1.8} />
      </button>
      <div style={{ flex: 1 }} />
      <button className="rail-btn" title={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={onToggleTheme}>
        {theme === 'dark' ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
      </button>
    </div>
  );
}
