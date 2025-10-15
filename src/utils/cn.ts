export function cn(...classes: Array<string | false | null | undefined>) {
  return classes
    .filter(isTruthyString)
    .map(c => c.trim().replace(/\s+/g, ' '))
    .join(' ')
}

function isTruthyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value)
}
