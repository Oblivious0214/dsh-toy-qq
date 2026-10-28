import { split } from './split.ts'
/** Self-contained worker entry: bundled parser, no network or host modules. */
globalThis.onmessage = ({ data }: MessageEvent<{ text: string; pattern: string; threshold: number }>) => {
  try { globalThis.postMessage({ chunks: split(data.text, data.pattern, data.threshold) }) }
  catch { globalThis.postMessage({ error: 'regex' }) }
}
