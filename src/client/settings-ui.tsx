import type { CSSProperties } from 'react'

/** Shared by appearance, segmentation and voice settings. */
export const settingsGroupStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 16,
  width: '100%', minWidth: 0, boxSizing: 'border-box',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 400, lineHeight: '22px',
  color: 'var(--dsw-alias-label-primary)',
}

export const settingsRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 12, minWidth: 0,
}

export const settingsLabelStyle: CSSProperties = {
  font: 'inherit', color: 'var(--dsw-alias-label-primary)',
}

export const settingsSectionTitleStyle: CSSProperties = {
  ...settingsLabelStyle, margin: 0, fontWeight: 600,
}

export const settingsControlStyle: CSSProperties = {
  boxSizing: 'border-box', minHeight: 32, minWidth: 0, maxWidth: '100%',
  padding: '4px 10px', borderRadius: 10,
  border: '1px solid var(--dsw-alias-border-l2)',
  color: 'var(--dsw-alias-label-primary)',
  background: 'var(--dsw-specific-input-major)', font: 'inherit',
}

export const settingsHintStyle: CSSProperties = {
  margin: 0, font: 'inherit', color: 'var(--dsw-alias-label-secondary)',
}

export function SettingsToggle({ label, checked, onChange, disabled = false }: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return <div style={settingsRowStyle}>
    <span style={settingsLabelStyle}>{label}</span>
    <button type="button" role="switch" aria-label={label} aria-checked={checked}
      disabled={disabled} onClick={() => onChange(!checked)}
      style={{
        boxSizing: 'border-box', flex: 'none', width: 36, height: 20,
        padding: 0, border: 'none', borderRadius: 999, position: 'relative', font: 'inherit',
        background: checked ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-bg-module-platform)',
        boxShadow: checked ? 'none' : 'inset 0 0 0 1px var(--dsw-alias-border-l3)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .5 : 1,
        transition: 'background 0.15s ease',
      }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)', transition: 'left 0.15s ease',
      }} />
    </button>
  </div>
}

export const SETTINGS_LAYOUT_CSS = `
  [data-qq-interface-settings] { container: qq-settings / inline-size; }
  [data-qq-palette-grid] { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
  [data-qq-settings-grid] { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; align-items: center; }
  [data-qq-interface-settings] :is(button, input, select, textarea):focus-visible {
    outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px;
  }
  [data-qq-interface-settings] button:disabled { cursor: default; opacity: .5; }
  @container qq-settings (max-width: 460px) {
    [data-qq-palette-grid] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    [data-qq-settings-grid] { grid-template-columns: minmax(0, 1fr); }
  }
`
