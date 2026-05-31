export function safeParseOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return []
  try {
    const parsed = JSON.parse(optionsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function tally(
  type: string,
  optionsJson: string | null,
  values: string[]
): Record<string, number> {
  if (type === 'yesno') {
    return {
      yes: values.filter(v => v === 'yes').length,
      no: values.filter(v => v === 'no').length,
    }
  }
  const options = safeParseOptions(optionsJson)
  const counts: Record<string, number> = {}
  options.forEach((_, i) => { counts[String(i)] = 0 })
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1 })
  return counts
}
