import { useEffect, useState } from 'react'
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

  if (!settings) return <p>Loading…</p>

  return (
    <section>
      <h1>Settings</h1>

      <label>
        External editor command (optional)
        <input
          type="text"
          placeholder="e.g. code"
          value={settings.externalEditorCommand ?? ''}
          onChange={(e) =>
            setSettings({ ...settings, externalEditorCommand: e.target.value })
          }
        />
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
          <option value="-x">-x (record origin commit)</option>
        </select>
      </label>

      <button type="button" onClick={handleSave}>
        Save
      </button>
      {saved && <span className="muted"> Saved.</span>}
    </section>
  )
}

export default SettingsPage
