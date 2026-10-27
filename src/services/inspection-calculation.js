import sheets from '../assets/inspection-calculation.json'

// A deliberately small, non-executing spreadsheet interpreter for the versioned template.
// Uploaded formulas never enter this interpreter. Blank cells remain distinct from zero.
const trees = new Map()
const operators = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 }
const fail = error => { throw new Error(error) }
export const columnName = n => n > 26 ? columnName(Math.floor((n - 1) / 26)) + String.fromCharCode(65 + (n - 1) % 26) : String.fromCharCode(64 + n)
const columnNumber = s => [...s].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0)
function parse(formula) {
  if (trees.has(formula)) return trees.get(formula)
  const tokens = [], pattern = /\s*("(?:[^"]|"")*"|'(?:[^']|'')*'|\$?[A-Za-z]+\$?\d+|[\p{L}_][\p{L}\p{N}_.]*|(?:\d+\.?\d*|\.\d+)(?:E[+-]?\d+)?|<>|<=|>=|[+\-*/^&=<>(),!:])/uy
  let i = 0, match
  while (i < formula.length) { pattern.lastIndex = i; match = pattern.exec(formula); if (!match) fail('Unsupported formula syntax'); tokens.push(match[1]); i = pattern.lastIndex }
  let pos = 0
  const take = token => { if (tokens[pos++] !== token) fail('Invalid formula') }
  function expression(min = 0) {
    let token = tokens[pos++], node
    if (token === '(') { node = expression(); take(')') }
    else if (token === '-' || token === '+') node = ['unary', token, expression(6)]
    else if (token?.startsWith('"')) node = ['value', token.slice(1, -1).replaceAll('""', '"')]
    else if (/^(?:\d|\.\d)/.test(token || '')) node = ['value', Number(token)]
    else if (tokens[pos] === '(') {
      pos++; const args = []
      if (tokens[pos] !== ')') { do { args.push(expression()); if (tokens[pos] !== ',') break; pos++ } while (true) }
      take(')'); node = ['call', token.toUpperCase(), args]
    } else {
      let sheet = null
      if (tokens[pos] === '!') { sheet = token.replace(/^'|'$/g, '').replaceAll("''", "'"); pos++; token = tokens[pos++] }
      if (!/^\$?[A-Za-z]+\$?\d+$/.test(token || '')) fail('Unsupported reference')
      const address = token.replaceAll('$', '').toUpperCase()
      if (tokens[pos] === ':') { pos++; node = ['range', sheet, address, tokens[pos++].replaceAll('$', '').toUpperCase()] }
      else node = ['ref', sheet, address]
    }
    while (operators[tokens[pos]] >= min) { const op = tokens[pos++]; node = ['op', op, node, expression(operators[op] + 1)] }
    return node
  }
  const result = expression(); if (pos !== tokens.length) fail('Unexpected formula token')
  trees.set(formula, result); return result
}
const num = v => v === null || v === '' || v === false ? 0 : typeof v === 'number' ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v.replace('−', '-'))) ? Number(v.replace('−', '-')) : fail('#VALUE!')
const dateSerial = value => {
  if (typeof value === 'number') return value
  let text = String(value || ''), match = text.match(/^(\d{1,2})\/(\d{4})$/)
  if (match) text = `${match[2]}-${match[1].padStart(2, '0')}-01`
  const timestamp = Date.parse(text); if (!Number.isFinite(timestamp)) fail('#VALUE!')
  return timestamp / 86400000 + 25569
}
const textValue = v => v === null ? '' : String(v)
export function inspectionCalculator(values, additionalSheets = {}) {
  const cache = new Map(), active = new Set()
  function get(sheet, address) {
    const key = sheet + '!' + address
    if (Object.hasOwn(values, key)) return values[key]
    if (cache.has(key)) { const v = cache.get(key); if (v instanceof Error) throw v; return v }
    if (active.has(key)) fail('#CYCLE!')
    active.add(key)
    try { const extra = additionalSheets[sheet]?.[address]; const cell = extra?.f || extra?.v != null ? extra : sheets[sheet]?.[address]; const value = cell?.f ? evaluate(parse(cell.f), sheet) : cell?.v ?? null; cache.set(key, value); return value }
    catch (e) { cache.set(key, e); throw e } finally { active.delete(key) }
  }
  function evaluate(node, sheet) {
    const [kind, a, b, c] = node
    if (kind === 'value') return a
    if (kind === 'ref') return get(a || sheet, b)
    if (kind === 'range') {
      const [startCol, startRow] = b.match(/[A-Z]+|\d+/g), [endCol, endRow] = c.match(/[A-Z]+|\d+/g), result = []
      for (let row = +startRow; row <= +endRow; row++) for (let col = columnNumber(startCol); col <= columnNumber(endCol); col++) result.push(get(a || sheet, columnName(col) + row))
      return result
    }
    if (kind === 'unary') return (a === '-' ? -1 : 1) * num(evaluate(b, sheet))
    if (kind === 'op') {
      let left = evaluate(b, sheet), right = evaluate(c, sheet)
      if (a === '&') return textValue(left) + textValue(right)
      if (operators[a] === 1) {
        if (left === null) left = typeof right === 'string' ? '' : 0
        if (right === null) right = typeof left === 'string' ? '' : 0
        if (typeof left === 'string' && typeof right === 'string') { left = left.toLocaleLowerCase(); right = right.toLocaleLowerCase() }
        // Excel orders text above numbers for relational comparisons (e.g. '100 UR' > 0).
        if (!['=', '<>'].includes(a)) { const rank = value => typeof value === 'boolean' ? 2 : typeof value === 'string' ? 1 : 0; if (rank(left) !== rank(right)) { const l = rank(left), r = rank(right); left = l; right = r } }
        return { '=': () => left === right, '<>': () => left !== right, '<': () => left < right, '>': () => left > right, '<=': () => left <= right, '>=': () => left >= right }[a]()
      }
      left = num(left); right = num(right)
      if (a === '/' && !right) fail('#DIV/0!')
      return { '+': () => left + right, '-': () => left - right, '*': () => left * right, '/': () => left / right, '^': () => left ** right }[a]()
    }
    const arg = i => evaluate(b[i], sheet)
    if (a === 'IFERROR') { try { return arg(0) } catch { return arg(1) } }
    if (a === 'IF') return arg(0) ? arg(1) : arg(2)
    if (a === 'IFS') { for (let i = 0; i < b.length; i += 2) if (arg(i)) return arg(i + 1); fail('#N/A') }
    if (a === '__XLUDF.DUMMYFUNCTION') fail('#UNSUPPORTED!')
    const args = b.map(n => evaluate(n, sheet)), flat = args.flat(), numbers = flat.filter(v => typeof v === 'number')
    switch (a) {
      case 'SUM': return numbers.reduce((x, y) => x + y, 0)
      case 'AVERAGE': if (!numbers.length) fail('#DIV/0!'); return numbers.reduce((x, y) => x + y, 0) / numbers.length
      case 'MIN': case 'MINA': return numbers.length ? Math.min(...numbers) : 0
      case 'MAX': return numbers.length ? Math.max(...numbers) : 0
      case 'MINUS': return num(args[0]) - num(args[1])
      case 'MULTIPLY': return num(args[0]) * num(args[1])
      case 'DIVIDE': if (!num(args[1])) fail('#DIV/0!'); return num(args[0]) / num(args[1])
      case 'QUOTIENT': if (!num(args[1])) fail('#DIV/0!'); return Math.trunc(num(args[0]) / num(args[1]))
      case 'POWER': return num(args[0]) ** num(args[1])
      case 'SQRT': return Math.sqrt(num(args[0]))
      case 'SIN': return Math.sin(num(args[0]))
      case 'PI': return Math.PI
      case 'ABS': return Math.abs(num(args[0]))
      case 'ROUND': return Math.round(num(args[0]) * 10 ** num(args[1])) / 10 ** num(args[1])
      case 'DATEVALUE': return dateSerial(args[0])
      case 'SMALL': { const n = args[0].filter(v => typeof v === 'number').sort((x, y) => x - y); if (!n[num(args[1]) - 1] && n[num(args[1]) - 1] !== 0) fail('#NUM!'); return n[num(args[1]) - 1] }
      case 'CONCATENATE': return flat.map(textValue).join('')
      case 'TEXT': if (/^y{2}$/i.test(args[1])) return String(new Date((dateSerial(args[0]) - 25569) * 86400000).getUTCFullYear()).slice(-2); if (/^0+$/.test(args[1])) return String(Math.round(num(args[0]))).padStart(args[1].length, '0'); return textValue(args[0])
      default: fail('Unsupported function: ' + a)
    }
  }
  return { get, safe(sheet, cell) { try { const result = get(sheet, cell); return typeof result === 'number' && !Number.isFinite(result) ? null : result } catch { return null } } }
}

export function inspectionRatingValues(values, layout = 'standard') {
  if (layout !== 'F') return values
  // Material condition uses the original offset, as in the F report's shared header.
  return { ...values, 'Vnos podatkov!B29': 'ne', 'A!AB28': values['F!AF30'] ?? null }
}
