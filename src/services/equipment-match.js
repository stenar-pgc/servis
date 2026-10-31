import catalog from '../assets/paragliders.json'

export const normalize = value =>
  String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

// Spellings found in reports that differ from the catalog and register names.
const aliases = {
  charlyfinsterwalder: 'Charly',
  wv: 'Woody Valley',
  avasport: 'AVA Sport',
  ginglider: 'GIN'
}

const brandMaps = new WeakMap()
function brands(equipment) {
  if (brandMaps.has(equipment)) return brandMaps.get(equipment)
  const map = new Map(Object.entries(aliases))
  for (const item of equipment) if (item.manufacturer && !map.has(normalize(item.manufacturer))) map.set(normalize(item.manufacturer), item.manufacturer)
  for (const brand of catalog.manufacturers) for (const name of [brand.name, ...brand.aliases]) map.set(normalize(name), brand.name)
  brandMaps.set(equipment, map)
  return map
}

export const canonicalBrand = (name, equipment = []) => brands(equipment).get(normalize(name)) || String(name || '').trim()

const SIZE = /^(XXS|XS|S|SM|MS|M|ML|L|XL|XXL|\d{2,3}|\d{2}[.,]\d)$/i

// 'Gin Yeti 4 26' -> GIN / Yeti 4 / 26. Manufacturers come from the catalog and the register.
export function splitModel(full, equipment = []) {
  const words = String(full || '').trim().split(/\s+/).filter(Boolean)
  const known = brands(equipment)
  let manufacturer = '',
    rest = words
  for (let k = Math.min(3, words.length - 1); k >= 1 && !manufacturer; k--) {
    const name = known.get(normalize(words.slice(0, k).join(' ')))
    if (name) [manufacturer, rest] = [name, words.slice(k)]
  }
  const prefix = words[0]?.split('-')[0]
  if (!manufacturer && words.length > 1 && prefix.length >= 4 && known.has(normalize(prefix)))
    [manufacturer, rest] = [known.get(normalize(prefix)), words.slice(1)]
  if (!manufacturer && words.length > 1) [manufacturer, rest] = [words[0], words.slice(1)]
  let size = ''
  const last = rest.at(-1)
  if (rest.length >= 2 && SIZE.test(last) && !(/^\d+$/.test(last) && Number(last) < 14)) {
    size = /^\d/.test(last) ? last : last.toUpperCase()
    rest = rest.slice(0, -1)
  }
  return { manufacturer, model: rest.join(' '), size }
}

// The register item a file or entry refers to: the same serial anywhere, otherwise the same model without
// a different serial on this service or owned by its customer. Model names alone never match across customers.
export function matchEquipment(identity, equipment, { orderIds = [], customerId = null } = {}) {
  const serial = normalize(identity.serial),
    brand = normalize(canonicalBrand(identity.manufacturer, equipment)),
    model = normalize(identity.model),
    size = normalize(identity.size)
  const sameBrand = item => !brand || !normalize(item.manufacturer) || normalize(canonicalBrand(item.manufacturer, equipment)) === brand
  const onOrder = item => orderIds.map(Number).includes(Number(item.id))
  if (serial) {
    const found = equipment.filter(item => normalize(item.serial) === serial && sameBrand(item))
    if (found.length) return { item: found.find(onOrder) || found[0], reason: 'serial' }
  }
  if (!model) return null
  const sameModel = item =>
    normalize(item.model) === model &&
    sameBrand(item) &&
    (!size || !normalize(item.size) || normalize(item.size) === size) &&
    (!serial || !normalize(item.serial))
  const pools = [
    ['order', equipment.filter(onOrder)],
    ['customer', customerId ? equipment.filter(item => Number(item.customer_id) === Number(customerId)) : []]
  ]
  for (const [reason, pool] of pools) {
    const found = pool.filter(sameModel)
    if (found.length === 1) return { item: found[0], reason }
  }
  return null
}

// Free-text search over the register: every word must appear in the item, its serial or its owner.
export function searchEquipment(query, equipment, limit = 6) {
  const terms = String(query || '').split(/\s+/).map(normalize).filter(Boolean)
  if (!terms.length) return []
  return equipment
    .filter(item => {
      const text = normalize([item.manufacturer, item.model, item.size, item.serial, item.customer_name].join(' '))
      return terms.every(term => text.includes(term))
    })
    .slice(0, limit)
}

// Register items resembling an entry being typed: the same serial, or the same manufacturer and model.
export function similarEquipment(entry, equipment, limit = 6) {
  const serial = normalize(entry.serial),
    brand = normalize(canonicalBrand(entry.manufacturer, equipment)),
    model = normalize(entry.model)
  if (!serial && !(brand && model)) return []
  return equipment
    .filter(item =>
      serial
        ? normalize(item.serial) === serial
        : normalize(canonicalBrand(item.manufacturer, equipment)) === brand && normalize(item.model).startsWith(model)
    )
    .slice(0, limit)
}

export const equipmentName = item =>
  [item?.manufacturer, item?.model, item?.size].map(value => String(value || '').trim()).filter(Boolean).join(' ')
