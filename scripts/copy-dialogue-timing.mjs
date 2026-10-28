import { cp, mkdir } from 'node:fs/promises'

// Emitted declarations keep the source-relative vendor path under lib/.
// Copy both the runtime source and its types before bundling from lib/types/.
const target = new URL('../lib/vendor/dialogue-timing/', import.meta.url)
await mkdir(target, { recursive: true })
await cp(new URL('../vendor/dialogue-timing/', import.meta.url), target, { recursive: true })
