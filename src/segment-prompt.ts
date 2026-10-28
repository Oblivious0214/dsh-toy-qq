import { SEGMENT_PROMPT } from '../vendor/dialogue-timing/protocol.js'
import type { Config } from './settings-schema.ts'

/** Narrow adapter for the inspected DSH systemPrompt.section contract. */
export interface PromptRegistry {
  section(section: { name: string; order: number; text: () => string; interpolate: false }): () => void
}
export function segmentPrompt(config: Pick<Config, 'segments'>): string {
  return config.segments.get().enabled ? SEGMENT_PROMPT : ''
}
