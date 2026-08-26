import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { AppSettings } from '@shared/types'

function SettingsPage(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void window.api.settings.get().then(setSettings)
  }, [])

  async function handleSave(): Promise<void> {
    if (!settings) return
    const updated = await window.api.settings.update(settings)
    setSettings(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  if (!settings) {
    return (
      <div className="page">
        <div className="skeleton-row" style={{ height: 24, width: 120 }} />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Preferences that apply across all managed repos.</p>
        </div>
      </div>

      <div className="panel stack" style={{ padding: 'var(--space-5)' }}>
        <label>
          External editor command
          <input
            type="text"
            placeholder="e.g. code"
            value={settings.externalEditorCommand ?? ''}
            onChange={(e) => setSettings({ ...settings, externalEditorCommand: e.target.value })}
          />
          <span className="field-hint">
            Used by "Open in Editor" during conflict resolution. Leave blank to use your OS
            default for the file type.
          </span>
        </label>

        <label>
          Cherry-pick strategy
          <select
            value={settings.cherryPickStrategy}
            onChange={(e) =>
              setSettings({
                ...settings,
                cherryPickStrategy: e.target.value as AppSettings['cherryPickStrategy']
              })
            }
          >
            <option value="default">Default</option>
            <option value="-x">-x (record origin commit in message)</option>
          </select>
        </label>

        <div className="row">
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
          {saved && (
            <span className="row muted" style={{ color: 'var(--success)' }}>
              <Check size={14} />
              Saved
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
