import { columnName } from './inspection-calculation'

// These are the series referenced by the workbook's combined profile charts.
const rows = {
  A: { stack: 97, average: 82, leftColumn: 9 },
  B: { stack: 96, average: 81, leftColumn: 9 },
  F: { stack: 103, average: 88, leftColumn: 10 },
  'trimanje F': { stack: 103, average: 88, leftColumn: 10 }
}
export function inspectionProfileAxes(calculator, sheet, axes) {
  const source = rows[sheet]
  const read = (column, row) => {
    const value = calculator.safe(sheet, columnName(column) + row)
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }
  return axes.map((axis, index) => {
    if (axis.min == null) return { ...axis, segments: [], right: null, left: null }
    const column = index + 3, segments = []
    let positive = 0, negative = 0
    for (let series = 0; series < 6; series++) {
      const value = read(column, source.stack + series)
      if (value == null) continue
      const start = value >= 0 ? positive : negative, end = start + value
      if (value >= 0) positive = end
      else negative = end
      // The first two series position same-sign ranges; Excel renders them transparent.
      if (series >= 2 && value !== 0) segments.push({ start, end, outside: series >= 4 })
    }
    return { ...axis, min: read(column, source.stack-1), max: read(column, source.stack-2), segments, right: read(column, source.average), left: read(source.leftColumn + index, source.average) }
  })
}
