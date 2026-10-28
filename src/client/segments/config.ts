/** AstrBot installer v4.2 defaults; regex matches segments, not separators. */
export const DEFAULTS = {
  enabled: true,
  repeatAvatars: true,
  regex: '.*?[。？！~～…❤\\uFE0F]+(?:\\s*[❤\\uFE0F]+)*|.+$',
  threshold: 1000,
  animate: true,
  intervalMin: 0.5,
  intervalMax: 1.5,
  intervalMethod: 'random' as 'random' | 'log',
  logBase: 2.6,
}
export type Settings = typeof DEFAULTS
/** Normalize remote values before timing or worker allocation. */
export function settings(value?: Partial<Settings>): Settings {
  const s = { ...DEFAULTS, ...value }
  const number = (n: number, fallback: number, min: number, max: number) => Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback
  return { ...s, enabled: s.enabled === true, animate: s.animate === true, repeatAvatars: s.repeatAvatars === true,
    regex: typeof s.regex === 'string' ? s.regex : DEFAULTS.regex,
    threshold: Math.floor(number(s.threshold, 1000, 1, 20000)),
    intervalMin: number(s.intervalMin, .5, 0, 10), intervalMax: number(s.intervalMax, 1.5, 0, 10),
    intervalMethod: s.intervalMethod === 'log' ? 'log' : 'random', logBase: number(s.logBase, 2.6, 1.1, 10) }
}
/** AstrBot random / logarithmic pacing, capped at 10 seconds per segment. */
export function delay(text: string, config: Settings, random = Math.random): number {
  if (config.intervalMethod === 'log') {
    const words = /^[\x00-\x7f]*$/.test(text) ? text.trim().split(/\s+/).filter(Boolean).length : (text.match(/[\p{L}\p{N}]/gu) ?? []).length
    return Math.min(10, Math.log(words + 1) / Math.log(config.logBase) + random() * .5) * 1000
  }
  const min = Math.min(config.intervalMin, config.intervalMax)
  return (min + random() * Math.abs(config.intervalMax - config.intervalMin)) * 1000
}
