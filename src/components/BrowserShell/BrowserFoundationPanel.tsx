/**
 * Pillar 1 foundation — Downloads, Profiles, Passwords, Extensions.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { useBrowserProfileStore } from '../../lib/browser/browserProfileStore';
import { usePasswordVaultStore, decryptCredentialPassword } from '../../lib/browser/passwordVaultStore';
import { useBrowserExtensionsStore } from '../../lib/browser/browserExtensionsRegistry';
import { useDownloadsStore } from '../../state/downloadsStore';
import {
  startBrowserDownload,
  syncDownloadsFromDb,
  openDownloadFile,
  showDownloadInFolder,
} from '../../lib/browser/browserDownloads';
import { displayUrlBar } from '../../lib/browser/normalizeUrl';

const BG = '#0f1623';
const ACCENT = '#f0a030';
const SURFACE = '#151d2e';
const BORDER = '#ffffff14';

type TabId = 'downloads' | 'profiles' | 'passwords' | 'extensions';

type Props = {
  open: boolean;
  initialTab?: TabId;
  downloadUrl?: string;
  onClose: () => void;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'downloads', label: 'Downloads' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'passwords', label: 'Passwords' },
  { id: 'extensions', label: 'Extensions' },
];

export const BrowserFoundationPanel = memo(function BrowserFoundationPanel({
  open,
  initialTab = 'downloads',
  downloadUrl,
  onClose,
}: Props) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const downloads = useDownloadsStore((s) => s.downloads);
  const clearCompleted = useDownloadsStore((s) => s.clearCompleted);
  const profiles = useBrowserProfileStore((s) => s.profiles);
  const activeProfileId = useBrowserProfileStore((s) => s.activeProfileId);
  const setActiveProfile = useBrowserProfileStore((s) => s.setActiveProfile);
  const addProfile = useBrowserProfileStore((s) => s.addProfile);
  const extensions = useBrowserExtensionsStore((s) => s.extensions);
  const toggleExtension = useBrowserExtensionsStore((s) => s.toggle);
  const vaultLocked = usePasswordVaultStore((s) => s.locked);
  const unlock = usePasswordVaultStore((s) => s.unlock);
  const lock = usePasswordVaultStore((s) => s.lock);
  const credentials = usePasswordVaultStore((s) => s.credentials);
  const addCredential = usePasswordVaultStore((s) => s.addCredential);
  const removeCredential = usePasswordVaultStore((s) => s.removeCredential);
  const passphrase = usePasswordVaultStore((s) => s.passphrase);

  const [newProfileName, setNewProfileName] = useState('');
  const [unlockInput, setUnlockInput] = useState('');
  const [credOrigin, setCredOrigin] = useState('');
  const [credUser, setCredUser] = useState('');
  const [credPass, setCredPass] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      void syncDownloadsFromDb();
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (open && downloadUrl && tab === 'downloads') {
      void startBrowserDownload(downloadUrl);
    }
  }, [open, downloadUrl, tab]);

  const revealPassword = useCallback(
    async (id: string, enc: string) => {
      const plain = await decryptCredentialPassword(enc, passphrase);
      setRevealed((r) => ({ ...r, [id]: plain }));
    },
    [passphrase]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Browser foundation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9997,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 96vw)',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          background: SURFACE,
          border: `1px solid ${ACCENT}44`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: '#f0eeea', marginRight: 8 }}>
            Browser foundation
          </span>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                border: `1px solid ${tab === t.id ? ACCENT : BORDER}`,
                background: tab === t.id ? `${ACCENT}22` : 'transparent',
                color: tab === t.id ? ACCENT : '#8a8884',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              color: '#8a8884',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Esc
          </button>
        </header>

        <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
          {tab === 'downloads' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#8a8884' }}>
                  {downloads.length} item{downloads.length === 1 ? '' : 's'}
                </p>
                <button
                  type="button"
                  onClick={() => clearCompleted()}
                  style={{ fontSize: 11, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Clear completed
                </button>
              </div>
              {downloads.length === 0 ? (
                <p style={{ color: '#8a8884', fontSize: 13 }}>
                  No downloads yet. Use ⋮ → Download this page or Generate overview → Downloads.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {downloads.map((d) => (
                    <li
                      key={d.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: BG,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <div style={{ fontSize: 13, color: '#f0eeea' }}>{d.filename}</div>
                      <div style={{ fontSize: 10, color: '#8a8884', marginTop: 4 }}>
                        {d.status} · {displayUrlBar(d.url)}
                      </div>
                      {d.path && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => void openDownloadFile(d.path!)}
                            style={smallBtn}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => void showDownloadInFolder(d.path!)}
                            style={smallBtn}
                          >
                            Show in folder
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'profiles' && (
            <div>
              <p style={{ fontSize: 12, color: '#8a8884', marginTop: 0 }}>
                Each profile has isolated cookies and storage (native engine). Private uses incognito.
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setActiveProfile(p.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: `1px solid ${activeProfileId === p.id ? ACCENT : BORDER}`,
                        background: activeProfileId === p.id ? `${ACCENT}18` : BG,
                        color: '#f0eeea',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: p.color,
                        }}
                      />
                      <span style={{ flex: 1 }}>
                        {p.name}
                        {p.incognito && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: '#8a8884' }}>
                            (ephemeral)
                          </span>
                        )}
                      </span>
                      {activeProfileId === p.id && (
                        <span style={{ fontSize: 10, color: ACCENT }}>Active</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="New profile name"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => {
                    addProfile(newProfileName);
                    setNewProfileName('');
                  }}
                  style={smallBtn}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {tab === 'passwords' && (
            <div>
              {vaultLocked ? (
                <div>
                  <p style={{ fontSize: 12, color: '#8a8884' }}>
                    Unlock your local vault with a passphrase (stored only on this device).
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      type="password"
                      value={unlockInput}
                      onChange={(e) => setUnlockInput(e.target.value)}
                      placeholder="Passphrase"
                      style={inputStyle}
                      onKeyDown={(e) => e.key === 'Enter' && unlock(unlockInput) && setUnlockInput('')}
                    />
                    <button
                      type="button"
                      onClick={() => unlock(unlockInput)}
                      style={smallBtn}
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#4ade80' }}>Vault unlocked</span>
                    <button type="button" onClick={() => lock()} style={smallBtn}>
                      Lock
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                    <input
                      value={credOrigin}
                      onChange={(e) => setCredOrigin(e.target.value)}
                      placeholder="Site (e.g. github.com)"
                      style={inputStyle}
                    />
                    <input
                      value={credUser}
                      onChange={(e) => setCredUser(e.target.value)}
                      placeholder="Username / email"
                      style={inputStyle}
                    />
                    <input
                      type="password"
                      value={credPass}
                      onChange={(e) => setCredPass(e.target.value)}
                      placeholder="Password"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addCredential(credOrigin, credUser, credPass);
                        setCredOrigin('');
                        setCredUser('');
                        setCredPass('');
                      }}
                      style={smallBtn}
                    >
                      Save credential
                    </button>
                  </div>
                  {credentials.length === 0 ? (
                    <p style={{ color: '#8a8884', fontSize: 13 }}>No saved passwords.</p>
                  ) : (
                    credentials.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          padding: 10,
                          marginBottom: 8,
                          borderRadius: 8,
                          background: BG,
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <div style={{ fontSize: 13 }}>{c.origin}</div>
                        <div style={{ fontSize: 11, color: '#8a8884' }}>{c.username}</div>
                        <div style={{ fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>
                          {revealed[c.id] ?? '••••••••'}
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => void revealPassword(c.id, c.passwordEnc)}
                            style={smallBtn}
                          >
                            Reveal
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCredential(c.id)}
                            style={smallBtn}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'extensions' && (
            <div>
              <p style={{ fontSize: 12, color: '#8a8884', marginTop: 0 }}>
                Built-in Regen modules. Full Chrome MV3 loading is planned; toggles apply to shell features.
              </p>
              {extensions.map((ext) => (
                <label
                  key={ext.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 10,
                    marginBottom: 8,
                    borderRadius: 8,
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ext.enabled}
                    onChange={() => toggleExtension(ext.id)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    <span style={{ display: 'block', fontSize: 13, color: '#f0eeea' }}>
                      {ext.name}{' '}
                      <span style={{ fontSize: 10, color: '#8a8884' }}>v{ext.version}</span>
                    </span>
                    <span style={{ fontSize: 11, color: '#8a8884' }}>{ext.description}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  borderRadius: 6,
  background: BG,
  border: `1px solid ${BORDER}`,
  color: '#f0eeea',
  fontSize: 12,
};

const smallBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  background: `${ACCENT}18`,
  color: ACCENT,
  fontSize: 11,
  cursor: 'pointer',
};
