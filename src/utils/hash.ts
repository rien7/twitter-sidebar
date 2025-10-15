export function simpleHash(text: (string | undefined | null)[]): string
export function simpleHash(text: string): string
export function simpleHash(text: string | (string | undefined | null)[]) {
  const hash = (text: string) => {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0
    }
    return hash.toString(16)
  }
  if (typeof text === 'string') return hash(text)
  return hash(text.map(t => t ?? '').join(''))
}
