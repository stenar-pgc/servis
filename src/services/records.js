export const sameId = (left, right) => left != null && right != null && String(left) === String(right)

export function equipmentIds(order) {
  if (Array.isArray(order.equipment_ids)) return order.equipment_ids
  if (Array.isArray(order.equipment)) return order.equipment.map(item => item.id)
  return order.equipment_id ? [order.equipment_id] : []
}

export const equipmentLabel = item => [item.manufacturer, item.model, item.size].filter(Boolean).join(' ') || item.type || ''
export const isRowNavigation = event => !event.target.closest('a,button,input,select,textarea,[role="button"]:not(tr)')
