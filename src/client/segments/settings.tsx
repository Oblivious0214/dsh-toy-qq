import { useState, useSyncExternalStore } from 'react'
export interface SegmentSettingsWriter { set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<boolean> }
import { DEFAULTS, type Settings } from './config.ts'
import type { Model } from './model.ts'

import {
  settingsGroupStyle, settingsRowStyle as row, settingsControlStyle as control,
  settingsSectionTitleStyle, SettingsToggle,
} from '../settings-ui.tsx'

/** Embedded QQ settings section; all writes use the QQ plugin configuration. */
export function createSettings(model: Model, host: SegmentSettingsWriter) {
  return function SegmentSettings() {
    const { config, status } = useSyncExternalStore(model.subscribe, model.getSnapshot)
    const [draft, setDraft] = useState<string>()
    const [busy, setBusy] = useState(false)
    const save = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setBusy(true)
      try { if (!await host.set(key, value)) throw new Error('refused'); if (key === 'regex') setDraft(undefined) }
      catch { model.report('设置保存失败，请重试。') }
      finally { setBusy(false) }
    }
    return <section data-qq-segment-settings="" style={settingsGroupStyle} aria-label="对话分段">
      <h3 style={settingsSectionTitleStyle}>对话分段</h3>
      <div data-qq-settings-grid="">
        <SettingsToggle label="启用分段显示" checked={config.enabled} disabled={busy} onChange={value => void save('enabled', value)} />
        <SettingsToggle label="每个分段显示头像" checked={config.repeatAvatars} disabled={busy} onChange={value => void save('repeatAvatars', value)} />
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0}}>
        <div style={{...row, flexWrap: 'wrap'}}>
          <label htmlFor="qq-segment-regex">分段正则（匹配每一段，不填写 / /）</label>
          <button type="button" data-qq-reset-regex="" style={{...control, marginLeft: 'auto', flex: 'none'}} disabled={busy} onClick={() => void save('regex', DEFAULTS.regex)}>恢复默认正则</button>
        </div>
        <textarea id="qq-segment-regex" aria-label="分段正则" value={draft ?? config.regex} maxLength={512} disabled={busy}
          onChange={e => setDraft(e.target.value)}
          onBlur={e => {
            // Reset writes the default directly; do not race it with a draft save.
            if (e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-qq-reset-regex]')) return
            if (draft !== undefined && draft !== config.regex) void save('regex', draft)
          }}
          style={{...control, width: '100%', minHeight: 72, resize: 'vertical'}} />
      </div>
      <div data-qq-settings-grid="">
      <label style={row}>分段字数阈值 <input aria-label="分段字数阈值" style={{ ...control, width: 96 }} type="number" min={1} max={20000} value={config.threshold} disabled={busy} onChange={e => { if (e.target.value) void save('threshold', Math.max(1, Math.min(20000, +e.target.value))) }} /></label>
      <SettingsToggle label="新回复逐段出现" checked={config.animate} disabled={busy} onChange={value => void save('animate', value)} />
      <label style={row}>显示速度 <select style={{...control, maxWidth:'60%'}} aria-label="显示速度" value={config.intervalMethod} disabled={busy} onChange={e => void save('intervalMethod', e.target.value as Settings['intervalMethod'])}><option value="random">随机间隔</option><option value="log">按字数计算（对数）</option></select></label>
      {(['logBase', 'intervalMin', 'intervalMax'] as const).map(key => <label style={row} key={key}>{key === 'intervalMin' ? '最短间隔（秒）' : key === 'intervalMax' ? '最长间隔（秒）' : '对数底数'} <input aria-label={key} style={{ ...control, width: 96 }} type="number" step={.1} min={key === 'logBase' ? 1.1 : 0} max={10} value={config[key]} disabled={busy} onChange={e => { if (e.target.value) void save(key, Math.max(key === 'logBase' ? 1.1 : 0, Math.min(10, +e.target.value))) }} /></label>)}
      </div>
      {status && <p role="status">{status}</p>}
    </section>
  }
}
