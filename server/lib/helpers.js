export function datePlusDaysCompat(iso, days) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function rowsToMap(rows, keyField) {
  const m = new Map()
  for (const r of rows) m.set(r[keyField], r)
  return m
}
