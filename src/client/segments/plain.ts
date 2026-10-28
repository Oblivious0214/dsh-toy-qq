/** Fixed main-thread admission for plain-source clipboard mapping; no user regex. */
export function eligible(text: string, threshold: number): boolean {
  if (!text || text.length > 40000 || Array.from(text).length > threshold) return false
  return !/[`*_\[\]<>\\$|]|~~|https?:\/\/|www\.|^ {0,3}(?:#{1,6}\s|>\s?|[-+]\s|\d+[.)]\s|[-=]+\s*$)|^ {4}|\t/m.test(text)
}
